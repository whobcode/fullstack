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

    // Check and grant special account status if applicable
    await checkAndGrantSpecialAccount(db, userId, username);

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

        // Check and grant special account status if applicable
        await checkAndGrantSpecialAccount(db, userQuery.id, userQuery.username);

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

type FBProfile = {
  id: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
  cover?: { source?: string };
  about?: string;
  location?: { name?: string };
};

type FBTokenDebugData = {
  data?: {
    is_valid?: boolean;
    scopes?: string[];
  };
};

async function fetchFacebookProfile(accessToken: string, appId?: string, appSecret?: string): Promise<FBProfile> {
  // If app credentials are present, validate the token
  if (appId && appSecret) {
    const appToken = `${appId}|${appSecret}`;
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`;
    const dbg = await fetch(debugUrl);
    const dbgJson = await dbg.json<FBTokenDebugData & { error?: { message?: string } }>();
    if (!dbg.ok || !dbgJson?.data?.is_valid) {
      console.error('Facebook token validation failed:', JSON.stringify(dbgJson));
      throw new Error(dbgJson?.error?.message || 'Invalid Facebook token');
    }
  }

  // Fetch extended profile data including cover photo, picture, about, and location
  const profileUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large),cover,about,location&access_token=${accessToken}`;
  const res = await fetch(profileUrl);
  const json = await res.json<FBProfile & { error?: { message?: string; code?: number; type?: string } }>();
  if (!res.ok || json.error) {
    console.error('Facebook profile fetch failed:', JSON.stringify(json.error));
    throw new Error(json.error?.message || 'Failed to fetch Facebook profile');
  }
  return json;
}

type FBUserResult = {
  id: string;
  email: string;
  username: string;
  characterId: string | null;
  needs_username_confirmation: boolean;
  avatar_url?: string;
  cover_photo_url?: string;
};

async function ensureUserFromFacebook(db: D1Database, profile: FBProfile): Promise<FBUserResult> {
  // D1 doesn't accept undefined, so convert to null
  const avatarUrl = profile.picture?.data?.url ?? null;
  const coverPhotoUrl = profile.cover?.source ?? null;
  const fbAbout = profile.about ?? null;
  const fbLocation = profile.location?.name ?? null;
  const rawProfileJson = JSON.stringify(profile);

  const existing = await db
    .prepare(`SELECT u.id, u.email, u.username, u.avatar_url, u.cover_photo_url, c.id as characterId
              FROM oauth_accounts oa
              JOIN users u ON oa.user_id = u.id
              LEFT JOIN characters c ON c.user_id = u.id
              WHERE oa.provider = 'facebook' AND oa.provider_account_id = ?`)
    .bind(profile.id)
    .first<{ id: string; email: string; username: string; avatar_url: string | null; cover_photo_url: string | null; characterId: string | null }>();

  if (existing) {
    // Update profile data on each login to keep it fresh
    await db.prepare(`
      UPDATE users SET
        avatar_url = COALESCE(?, avatar_url),
        cover_photo_url = COALESCE(?, cover_photo_url),
        fb_about = COALESCE(?, fb_about),
        fb_location = COALESCE(?, fb_location),
        fb_data_synced_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(avatarUrl, coverPhotoUrl, fbAbout, fbLocation, existing.id).run();

    // Update oauth_accounts with latest token scope and profile data
    await db.prepare(`
      UPDATE oauth_accounts SET
        raw_profile_json = ?,
        scope = ?
      WHERE provider = 'facebook' AND provider_account_id = ?
    `).bind(rawProfileJson, 'public_profile,email,user_photos,user_friends', profile.id).run();

    return {
      ...existing,
      avatar_url: avatarUrl || existing.avatar_url || undefined,
      cover_photo_url: coverPhotoUrl || existing.cover_photo_url || undefined,
      needs_username_confirmation: existing.username.startsWith('fb_') || existing.username.startsWith('fbuser')
    };
  }

  // New user - create account with Facebook profile data
  const userId = crypto.randomUUID();
  const characterId = crypto.randomUUID();
  const email = profile.email ?? `fb_${profile.id}@facebook.local`;
  const baseUsername = (profile.name || 'fb_user').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'fbuser';
  const username = await generateUniqueUsername(db, baseUsername);

  const batch = [
    db.prepare(`INSERT INTO users (id, email, username, email_verified, avatar_url, cover_photo_url, fb_about, fb_location, fb_data_synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(userId, email, username, !!profile.email, avatarUrl, coverPhotoUrl, fbAbout, fbLocation),
    db.prepare(`INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id, scope, raw_profile_json)
                VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), userId, 'facebook', profile.id, 'public_profile,email,user_photos,user_friends', rawProfileJson),
    db.prepare('INSERT INTO characters (id, user_id, first_game_access_completed) VALUES (?, ?, ?)')
      .bind(characterId, userId, false),
    db.prepare('INSERT INTO trophies (character_id) VALUES (?)')
      .bind(characterId),
  ];
  await db.batch(batch);
  return {
    id: userId,
    email,
    username,
    characterId,
    needs_username_confirmation: true,
    avatar_url: avatarUrl || undefined,
    cover_photo_url: coverPhotoUrl || undefined
  };
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

// Special account usernames that get elevated privileges
const SPECIAL_USERNAMES = ['trubone'];

// Helper to check and grant special account status
async function checkAndGrantSpecialAccount(db: D1Database, userId: string, username: string): Promise<void> {
  // Check if this is a special username
  if (!SPECIAL_USERNAMES.includes(username.toLowerCase())) {
    return;
  }

  // Check if already has special account status
  const existing = await db.prepare('SELECT id FROM special_accounts WHERE user_id = ?').bind(userId).first();
  if (existing) {
    return;
  }

  // Grant special account status
  try {
    await db.prepare(`
      INSERT INTO special_accounts (user_id, flag_type, all_slots_unlocked, auto_max_level, notes)
      VALUES (?, 'founder', TRUE, TRUE, 'Auto-granted to founder account')
    `).bind(userId).run();
    console.log(`Granted special account status to ${username} (${userId})`);
  } catch (err) {
    // Table might not exist yet if migration hasn't run
    console.warn('Could not grant special account status:', err);
  }
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

    // Check and grant special account status if applicable
    await checkAndGrantSpecialAccount(db, user.id, user.username);

    const sessionToken = await createSession(db, user.id);
    setCookie(c, 'session_token', sessionToken, {
      httpOnly: true,
      secure: c.req.url.startsWith('https://'),
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        characterId: user.characterId,
        needs_username_confirmation: user.needs_username_confirmation,
        avatar_url: user.avatar_url,
        cover_photo_url: user.cover_photo_url
      }
    });
  } catch (err: any) {
    console.error('Facebook auth failed:', err?.message || err);
    return c.json({ error: err?.message || 'Facebook authentication failed' }, 401);
  }
});

// Facebook Data Deletion / Deauthorize Callback
// Required by Facebook for GDPR compliance
auth.post('/facebook/deauthorize', async (c) => {
  const db = c.env.DB;
  try {
    const body = await c.req.parseBody();
    const signedRequest = body.signed_request as string;

    if (!signedRequest) {
      return c.json({ error: 'Missing signed_request' }, 400);
    }

    // Parse the signed request from Facebook
    // Format: base64_signature.base64_payload
    const [encodedSig, encodedPayload] = signedRequest.split('.');
    const payload = JSON.parse(atob(encodedPayload));
    const facebookUserId = payload.user_id;

    if (!facebookUserId) {
      return c.json({ error: 'Invalid signed_request' }, 400);
    }

    // Find the user by Facebook ID
    const user = await db
      .prepare(`SELECT user_id FROM oauth_accounts WHERE provider = 'facebook' AND provider_account_id = ?`)
      .bind(facebookUserId)
      .first<{ user_id: string }>();

    if (user) {
      // Delete all user sessions
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.user_id).run();

      // Delete OAuth account linkage
      await db.prepare('DELETE FROM oauth_accounts WHERE provider = ? AND provider_account_id = ?')
        .bind('facebook', facebookUserId)
        .run();

      // Optional: Mark user for deletion or delete completely
      // For now, we'll just remove the Facebook connection
      // If you want full deletion, uncomment below:
      // await db.prepare('DELETE FROM users WHERE id = ?').bind(user.user_id).run();
    }

    // Generate a confirmation code for Facebook
    const confirmationCode = crypto.randomUUID();

    // Return the required response format
    return c.json({
      url: `https://hwmnbn.me/facebook-deauthorize?code=${confirmationCode}`,
      confirmation_code: confirmationCode
    });
  } catch (err: any) {
    console.error('Facebook deauthorize failed:', err);
    return c.json({ error: 'Deauthorization failed' }, 500);
  }
});

// Data deletion status check endpoint
auth.get('/facebook/deletion', async (c) => {
  const confirmationCode = c.req.query('code');

  if (!confirmationCode) {
    return c.json({ error: 'Missing confirmation code' }, 400);
  }

  // In a production app, you'd store deletion requests and their status
  // For now, we'll just return a success message
  return c.json({
    message: 'Data deletion request processed',
    confirmation_code: confirmationCode,
    status: 'completed'
  });
});


export default auth;
