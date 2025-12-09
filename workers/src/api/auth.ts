import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie } from 'hono/cookie';
import type { Bindings } from '../bindings';
import { loginSchema, registerSchema } from '../shared/schemas/auth';
import { facebookAuthSchema } from '../shared/schemas/facebook';
import { hashPassword, verifyPassword } from '../lib/auth';
import { createSession } from '../lib/session';

const auth = new Hono<{ Bindings: Bindings }>();

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, username, password } = c.req.valid('json');
  const db = c.env.DB;

  try {
    // Check if user already exists
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
      .bind(email, username)
      .first();

    if (existingUser) {
      return c.json({ error: 'Email or username already in use' }, 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const characterId = crypto.randomUUID();

    // Use a transaction to ensure all or nothing
    const batch = [
      db.prepare(
        'INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)'
      ).bind(userId, email, username, passwordHash),
      db.prepare(
        'INSERT INTO characters (id, user_id, first_game_access_completed) VALUES (?, ?, ?)'
      ).bind(characterId, userId, false),
      db.prepare(
        'INSERT INTO trophies (character_id) VALUES (?)'
      ).bind(characterId),
    ];

    await db.batch(batch);

    // Create session
    const sessionToken = await createSession(db, userId);
    setCookie(c, 'session_token', sessionToken, {
      httpOnly: true,
      secure: c.req.url.startsWith('https://'),
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return c.json({ message: 'User registered successfully' }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'An internal error occurred' }, 500);
  }
});

auth.post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const db = c.env.DB;

    try {
        const userQuery = await db
            .prepare(`
                SELECT u.id, u.email, u.username, u.password_hash, c.id as characterId
                FROM users u
                LEFT JOIN characters c ON u.id = c.user_id
                WHERE u.email = ?
            `)
            .bind(email)
            .first<{ id: string; email: string; username: string; password_hash: string; characterId: string }>();

        if (!userQuery || !userQuery.password_hash) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        const isPasswordValid = await verifyPassword(password, userQuery.password_hash);

        if (!isPasswordValid) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        // Create session
        const sessionToken = await createSession(db, userQuery.id);
        setCookie(c, 'session_token', sessionToken, {
            httpOnly: true,
            secure: c.req.url.startsWith('https://'),
            sameSite: 'Lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        const { password_hash, ...userData } = userQuery;
        return c.json({ data: userData });
    } catch (error) {
        console.error('Login error:', error);
        return c.json({ error: 'An internal error occurred' }, 500);
    }
});

// We need to import the auth middleware to protect the logout route
import { authMiddleware } from './middleware/auth';
import { deleteCookie, getCookie } from 'hono/cookie';
import { hashToken } from '../lib/session';

type FBProfile = { id: string; name?: string; email?: string };

async function fetchFacebookProfile(accessToken: string, appId?: string, appSecret?: string): Promise<FBProfile> {
  // If app credentials are present, validate the token
  if (appId && appSecret) {
    const appToken = `${appId}|${appSecret}`;
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`;
    const dbg = await fetch(debugUrl);
    const dbgJson = await dbg.json<any>();
    if (!dbg.ok || !dbgJson?.data?.is_valid) {
      throw new Error('Invalid Facebook token');
    }
  }

  const profileUrl = `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`;
  const res = await fetch(profileUrl);
  const json = await res.json<FBProfile & { error?: any }>();
  if (!res.ok || json.error) {
    throw new Error('Failed to fetch Facebook profile');
  }
  return { id: json.id, name: json.name, email: json.email };
}

type FBUserResult = { id: string; email: string; username: string; characterId: string | null; needs_username_confirmation: boolean };

async function ensureUserFromFacebook(db: D1Database, profile: FBProfile): Promise<FBUserResult> {
  const existing = await db
    .prepare(`SELECT u.id, u.email, u.username, c.id as characterId
              FROM oauth_accounts oa
              JOIN users u ON oa.user_id = u.id
              LEFT JOIN characters c ON c.user_id = u.id
              WHERE oa.provider = 'facebook' AND oa.provider_account_id = ?`)
    .bind(profile.id)
    .first<{ id: string; email: string; username: string; characterId: string | null }>();

  if (existing) return { ...existing, needs_username_confirmation: existing.username.startsWith('fb_') };

  const userId = crypto.randomUUID();
  const characterId = crypto.randomUUID();
  const email = profile.email ?? `fb_${profile.id}@facebook.local`; // fallback if email not granted
  const baseUsername = (profile.name || 'fb_user').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'fbuser';
  const username = await generateUniqueUsername(db, baseUsername);

  const batch = [
    db.prepare('INSERT INTO users (id, email, username, email_verified) VALUES (?, ?, ?, ?)')
      .bind(userId, email, username, !!profile.email),
    db.prepare('INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, 'facebook', profile.id),
    db.prepare('INSERT INTO characters (id, user_id, first_game_access_completed) VALUES (?, ?, ?)')
      .bind(characterId, userId, false),
    db.prepare('INSERT INTO trophies (character_id) VALUES (?)')
      .bind(characterId),
  ];
  await db.batch(batch);
  return { id: userId, email, username, characterId, needs_username_confirmation: true };
}

async function generateUniqueUsername(db: D1Database, base: string): Promise<string> {
  let candidate = base || 'player';
  let suffix = 0;
  const MAX_ATTEMPTS = 10000;
  while (suffix < MAX_ATTEMPTS) {
    const exists = await db.prepare('SELECT 1 FROM users WHERE username = ?').bind(candidate).first();
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  // Fallback: use timestamp if we exhausted attempts
  return `${base}_${Date.now()}`;
}

auth.post('/logout', authMiddleware, async (c) => {
    const sessionToken = getCookie(c, 'session_token');
    const db = c.env.DB;

    if (sessionToken) {
        const tokenHash = await hashToken(sessionToken);
        await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    }

    deleteCookie(c, 'session_token');
    return c.json({ message: 'Logged out successfully' });
});

// Facebook SSO token exchange
auth.post('/facebook', zValidator('json', facebookAuthSchema), async (c) => {
  const { accessToken } = c.req.valid('json');
  const db = c.env.DB;
  try {
    const profile = await fetchFacebookProfile(accessToken, c.env.FACEBOOK_APP_ID, c.env.FACEBOOK_APP_SECRET);
    const user = await ensureUserFromFacebook(db, profile);
    const sessionToken = await createSession(db, user.id);
    setCookie(c, 'session_token', sessionToken, {
      httpOnly: true,
      secure: c.req.url.startsWith('https://'),
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ data: { id: user.id, email: user.email, username: user.username, characterId: user.characterId, needs_username_confirmation: user.needs_username_confirmation } });
  } catch (err: any) {
    console.error('Facebook auth failed:', err);
    return c.json({ error: 'Facebook authentication failed' }, 401);
  }
});


export default auth;
