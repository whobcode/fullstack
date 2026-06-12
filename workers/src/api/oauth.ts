import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { Bindings } from '../bindings';
import { createSession } from '../lib/session';
import {
  buildInitialCharacter,
  generateUniqueUsername,
  checkAndGrantSpecialAccount,
  SPECIAL_USERNAMES,
} from './auth';
import { getProvider, listEnabledProviders, type NormalizedProfile } from '../core/oauth-providers';

// Server-side OAuth2 (authorization-code) login for social providers
// (GitHub, Discord, …). Distinct from the Google flow in auth.ts, which is a
// client-side Google Identity Services id-token exchange.
//
// Mounted at /api/auth/oauth, so routes here are relative: /providers,
// /:provider/start, /:provider/callback.
const oauth = new Hono<{ Bindings: Bindings }>();

function appUrl(c: any): string {
  return c.env.APP_URL || new URL(c.req.url).origin;
}

function callbackUrl(c: any, providerId: string): string {
  return `${appUrl(c)}/api/auth/oauth/${providerId}/callback`;
}

function isHttps(c: any): boolean {
  return c.req.url.startsWith('https://') || appUrl(c).startsWith('https://');
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const STATE_MAX_AGE = 60 * 10; // 10 minutes

// Which social providers are usable right now (configured with secrets). The
// frontend uses this to decide which buttons to render.
oauth.get('/providers', (c) => {
  return c.json({ data: listEnabledProviders(c.env) });
});

// Kick off the flow: set a CSRF state cookie and redirect to the provider.
oauth.get('/:provider/start', async (c) => {
  const providerId = c.req.param('provider');
  const provider = getProvider(providerId, c.env);
  if (!provider) {
    return c.redirect(`${appUrl(c)}/login?error=provider_unavailable`);
  }

  const state = crypto.randomUUID();
  setCookie(c, `oauth_state_${providerId}`, state, {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: STATE_MAX_AGE,
  });

  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: callbackUrl(c, providerId),
    response_type: 'code',
    scope: provider.scope,
    state,
    ...(provider.extraAuthParams || {}),
  });

  return c.redirect(`${provider.authorizeUrl}?${params.toString()}`);
});

// Provider redirects back here with ?code & ?state. Verify state, exchange the
// code, provision/link the user, set the session cookie, bounce into the app.
oauth.get('/:provider/callback', async (c) => {
  const providerId = c.req.param('provider');
  const base = appUrl(c);
  const provider = getProvider(providerId, c.env);
  if (!provider) return c.redirect(`${base}/login?error=provider_unavailable`);

  const url = new URL(c.req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const denied = url.searchParams.get('error');

  const cookieName = `oauth_state_${providerId}`;
  const cookieState = getCookie(c, cookieName);
  deleteCookie(c, cookieName, { path: '/' });

  if (denied) return c.redirect(`${base}/login?error=oauth_denied`);
  if (!code || !state || !cookieState || state !== cookieState) {
    return c.redirect(`${base}/login?error=oauth_state`);
  }

  try {
    const profile = await provider.exchange(code, callbackUrl(c, providerId));
    const result = await ensureUserFromOAuth(c.env.DB, providerId, profile);

    await checkAndGrantSpecialAccount(c.env.DB, result.id, result.username);

    const sessionToken = await createSession(c.env.DB, result.id);
    setCookie(c, 'session_token', sessionToken, {
      httpOnly: true,
      secure: isHttps(c),
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    const dest = result.needs_username_confirmation ? '/profile/me?welcome=1' : '/feed';
    return c.redirect(`${base}${dest}`);
  } catch (err: any) {
    console.error(`OAuth callback failed (${providerId}):`, err?.message || err);
    return c.redirect(`${base}/login?error=oauth_failed`);
  }
});

type EnsureResult = { id: string; username: string; needs_username_confirmation: boolean };

// Find-or-link-or-create a user for a normalized social profile.
async function ensureUserFromOAuth(
  db: D1Database,
  provider: string,
  profile: NormalizedProfile,
): Promise<EnsureResult> {
  const rawProfileJson = JSON.stringify(profile.raw);

  // 1) Already linked: this exact provider account is known.
  const linked = await db
    .prepare(
      `SELECT u.id, u.username, u.avatar_url
       FROM oauth_accounts oa JOIN users u ON oa.user_id = u.id
       WHERE oa.provider = ? AND oa.provider_account_id = ?`,
    )
    .bind(provider, profile.providerAccountId)
    .first<{ id: string; username: string; avatar_url: string | null }>();

  if (linked) {
    await db
      .prepare(
        `UPDATE oauth_accounts SET raw_profile_json = ?, scope = ?
         WHERE provider = ? AND provider_account_id = ?`,
      )
      .bind(rawProfileJson, profile.scope, provider, profile.providerAccountId)
      .run();
    if (profile.avatarUrl && !linked.avatar_url) {
      await db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(profile.avatarUrl, linked.id).run();
    }
    return { id: linked.id, username: linked.username, needs_username_confirmation: false };
  }

  // 2) Link to an existing account by verified email (so signing in with a
  //    provider that shares your email attaches to your current account rather
  //    than making a duplicate). Only when the provider verified the address.
  if (profile.email && profile.emailVerified) {
    const existing = await db
      .prepare('SELECT id, username, avatar_url FROM users WHERE email = ?')
      .bind(profile.email)
      .first<{ id: string; username: string; avatar_url: string | null }>();
    if (existing) {
      await db
        .prepare(
          `INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id, scope, raw_profile_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), existing.id, provider, profile.providerAccountId, profile.scope, rawProfileJson)
        .run();
      if (profile.avatarUrl && !existing.avatar_url) {
        await db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(profile.avatarUrl, existing.id).run();
      }
      return { id: existing.id, username: existing.username, needs_username_confirmation: false };
    }
  }

  // 3) Brand-new user: create account + initial character + trophies + link.
  const userId = crypto.randomUUID();
  const characterId = crypto.randomUUID();
  const email = profile.email ?? `${provider}_${profile.providerAccountId}@${provider}.local`;
  const baseUsername =
    (profile.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || `${provider}user`;
  const username = await generateUniqueUsername(db, baseUsername);

  const characterStmt = await buildInitialCharacter(
    db,
    characterId,
    userId,
    username,
    SPECIAL_USERNAMES.includes(username.toLowerCase()),
  );

  await db.batch([
    db
      .prepare('INSERT INTO users (id, email, username, email_verified, avatar_url) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, email, username, profile.emailVerified ? 1 : 0, profile.avatarUrl),
    db
      .prepare(
        `INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id, scope, raw_profile_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), userId, provider, profile.providerAccountId, profile.scope, rawProfileJson),
    characterStmt,
    db.prepare('INSERT INTO trophies (character_id) VALUES (?)').bind(characterId),
  ]);

  return { id: userId, username, needs_username_confirmation: true };
}

export default oauth;
