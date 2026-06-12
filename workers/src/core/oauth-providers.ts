import type { Bindings } from '../bindings';

// A normalized identity returned by every provider's token exchange, so the
// rest of the auth code never needs to know provider-specific shapes.
export interface NormalizedProfile {
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
  scope: string;
  raw: unknown;
}

export interface ResolvedProvider {
  id: string;
  label: string;
  clientId: string;
  authorizeUrl: string;
  scope: string;
  // Extra params appended to the authorize redirect (e.g. Discord `prompt`).
  extraAuthParams?: Record<string, string>;
  // Exchange the authorization `code` for a normalized user profile.
  exchange: (code: string, redirectUri: string) => Promise<NormalizedProfile>;
}

// The ordered list of providers we know how to talk to. To add another social
// login, append its id here and add a case in `getProvider`.
export const KNOWN_PROVIDERS = ['discord', 'github'] as const;
export type ProviderId = (typeof KNOWN_PROVIDERS)[number];

// ---------------------------------------------------------------------------
// GitHub — https://docs.github.com/en/apps/oauth-apps
// ---------------------------------------------------------------------------
async function githubExchange(env: Bindings, code: string, redirectUri: string): Promise<NormalizedProfile> {
  const scope = 'read:user user:email';
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID || '',
      client_secret: env.GITHUB_CLIENT_SECRET || '',
      code,
      redirect_uri: redirectUri,
    }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) throw new Error(`GitHub token exchange failed: ${tokenJson.error || 'no access_token'}`);

  const ghHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'shade-me',
    Accept: 'application/vnd.github+json',
  };

  const userRes = await fetch('https://api.github.com/user', { headers: ghHeaders });
  if (!userRes.ok) throw new Error('GitHub profile fetch failed');
  const u = (await userRes.json()) as {
    id: number;
    login: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };

  // GitHub may hide the email on /user; pull the verified primary explicitly.
  let email = u.email ?? null;
  let emailVerified = !!u.email;
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', { headers: ghHeaders });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
      const chosen = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
      if (chosen) {
        email = chosen.email;
        emailVerified = true;
      }
    }
  }

  return {
    providerAccountId: String(u.id),
    email,
    emailVerified,
    name: u.name || u.login,
    avatarUrl: u.avatar_url ?? null,
    scope,
    raw: u,
  };
}

// ---------------------------------------------------------------------------
// Discord — https://discord.com/developers/docs/topics/oauth2
// ---------------------------------------------------------------------------
async function discordExchange(env: Bindings, code: string, redirectUri: string): Promise<NormalizedProfile> {
  const scope = 'identify email';
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID || '',
    client_secret: env.DISCORD_CLIENT_SECRET || '',
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) throw new Error(`Discord token exchange failed: ${tokenJson.error || 'no access_token'}`);

  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) throw new Error('Discord profile fetch failed');
  const u = (await userRes.json()) as {
    id: string;
    username: string;
    global_name?: string | null;
    email?: string | null;
    verified?: boolean;
    avatar?: string | null;
  };

  const avatarUrl = u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null;

  return {
    providerAccountId: String(u.id),
    email: u.email ?? null,
    emailVerified: !!u.verified,
    name: u.global_name || u.username,
    avatarUrl,
    scope,
    raw: u,
  };
}

// Resolve a provider by id, returning null when it is unknown or not configured
// (missing client id/secret). Callers treat null as "provider unavailable".
export function getProvider(id: string, env: Bindings): ResolvedProvider | null {
  switch (id) {
    case 'github':
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return null;
      return {
        id: 'github',
        label: 'GitHub',
        clientId: env.GITHUB_CLIENT_ID,
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        scope: 'read:user user:email',
        exchange: (code, redirectUri) => githubExchange(env, code, redirectUri),
      };
    case 'discord':
      if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) return null;
      return {
        id: 'discord',
        label: 'Discord',
        clientId: env.DISCORD_CLIENT_ID,
        authorizeUrl: 'https://discord.com/oauth2/authorize',
        scope: 'identify email',
        extraAuthParams: { prompt: 'consent' },
        exchange: (code, redirectUri) => discordExchange(env, code, redirectUri),
      };
    default:
      return null;
  }
}

// The providers that are actually usable right now (configured with secrets).
export function listEnabledProviders(env: Bindings): Array<{ id: string; label: string }> {
  return KNOWN_PROVIDERS.map((id) => getProvider(id, env))
    .filter((p): p is ResolvedProvider => p !== null)
    .map((p) => ({ id: p.id, label: p.label }));
}
