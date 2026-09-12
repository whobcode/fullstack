import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie } from 'hono/cookie';
import type { Bindings } from '../bindings';
import { loginSchema, registerSchema } from '../shared/schemas/auth';
import { googleAuthSchema } from '../shared/schemas/google';
import { magicLinkRequestSchema, magicLinkVerifySchema } from '../shared/schemas/magic-link';
import { passwordResetRequestSchema, passwordResetSchema, passwordChangeSchema } from '../shared/schemas/password-reset';
import { phoneCodeRequestSchema, phoneCodeVerifySchema } from '../shared/schemas/phone';
import { normalizePhone, hashPhone, generateOtp, maskPhone } from '../lib/phone';
import { sendSms, isSmsConfigured } from '../lib/sms';
import { hashPassword, verifyPassword } from '../lib/auth';
import { createSession } from '../lib/session';
import { rollInitialCharacter, sanitizeGamertag } from '../core/classes';

const auth = new Hono<{ Bindings: Bindings }>();

// Build the INSERT for a brand-new, immediately-playable character (gamertag + class + base stats).
export async function buildInitialCharacter(db: D1Database, characterId: string, userId: string, seedUsername: string, founder: boolean) {
  const gamertag = await generateUniqueGamertag(db, sanitizeGamertag(seedUsername));
  const c = rollInitialCharacter({ seed: userId, autoMax: founder });
  return db.prepare(
    `INSERT INTO characters (id, user_id, slot_number, gamertag, class, level, xp, hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed)
     VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`
  ).bind(characterId, userId, gamertag, c.cls, c.level, c.xp, c.hp, c.atk, c.def, c.mp, c.spd, c.unspentStatPoints);
}

async function generateUniqueGamertag(db: D1Database, base: string): Promise<string> {
  let candidate = base || 'player';
  let suffix = 0;
  while (suffix < 10000) {
    const exists = await db.prepare('SELECT 1 FROM characters WHERE gamertag = ?').bind(candidate).first();
    if (!exists) return candidate.slice(0, 20);
    suffix += 1;
    candidate = `${base}${suffix}`.slice(0, 20);
  }
  return `${base.slice(0, 8)}_${Date.now()}`.slice(0, 20);
}


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
    const characterStmt = await buildInitialCharacter(db, characterId, userId, username, SPECIAL_USERNAMES.includes(username.toLowerCase()));
    const batch = [
      db.prepare(
        'INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)'
      ).bind(userId, email, username, passwordHash),
      characterStmt,
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
    const { email: identifier, password } = c.req.valid('json');
    const db = c.env.DB;

    try {
        // The identifier is an email address or a phone number. Anything with
        // an "@" is treated as an email; everything else is normalized to E.164
        // and matched against the phone column.
        const isEmail = identifier.includes('@');
        const phone = isEmail ? null : normalizePhone(identifier);

        if (!isEmail && !phone) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        let userQuery: { id: string; email: string; username: string; password_hash: string; characterId: string } | null = null;

        try {
            userQuery = await db
                .prepare(`
                    SELECT u.id, u.email, u.username, u.password_hash, c.id as characterId
                    FROM users u
                    LEFT JOIN characters c ON u.id = c.user_id
                    WHERE ${isEmail ? 'u.email = ?' : 'u.phone = ? AND u.phone_verified = TRUE'}
                `)
                .bind(isEmail ? identifier : phone)
                .first<{ id: string; email: string; username: string; password_hash: string; characterId: string }>();
        } catch (lookupError) {
            // The phone columns arrive with migration 0018. If this release is
            // running ahead of it, treat a phone identifier as simply unknown
            // rather than surfacing a 500 on the login form.
            if (isEmail) throw lookupError;
            console.error('Phone lookup unavailable (migration 0018 not applied?):', lookupError);
            return c.json({ error: 'Invalid credentials' }, 401);
        }

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

// Google ID Token payload (decoded JWT)
type GoogleTokenPayload = {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat: number;
  exp: number;
};

// Decode and verify Google ID token
async function verifyGoogleToken(credential: string, clientId?: string): Promise<GoogleTokenPayload> {
  const parts = credential.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as GoogleTokenPayload;

  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('Invalid token issuer');
  }

  if (clientId && payload.aud !== clientId) {
    throw new Error('Token audience mismatch');
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new Error('Token expired');
  }

  return payload;
}

type GoogleUserResult = {
  id: string;
  email: string;
  username: string;
  characterId: string | null;
  needs_username_confirmation: boolean;
  avatar_url?: string;
};

async function ensureUserFromGoogle(db: D1Database, profile: GoogleTokenPayload): Promise<GoogleUserResult> {
  const avatarUrl = profile.picture ?? null;
  const rawProfileJson = JSON.stringify(profile);

  const existing = await db
    .prepare(`SELECT u.id, u.email, u.username, u.avatar_url, c.id as characterId
              FROM oauth_accounts oa
              JOIN users u ON oa.user_id = u.id
              LEFT JOIN characters c ON c.user_id = u.id
              WHERE oa.provider = 'google' AND oa.provider_account_id = ?`)
    .bind(profile.sub)
    .first<{ id: string; email: string; username: string; avatar_url: string | null; characterId: string | null }>();

  if (existing) {
    await db.prepare(`
      UPDATE users SET
        avatar_url = COALESCE(?, avatar_url)
      WHERE id = ?
    `).bind(avatarUrl, existing.id).run();

    await db.prepare(`
      UPDATE oauth_accounts SET
        raw_profile_json = ?
      WHERE provider = 'google' AND provider_account_id = ?
    `).bind(rawProfileJson, profile.sub).run();

    return {
      ...existing,
      avatar_url: avatarUrl || existing.avatar_url || undefined,
      needs_username_confirmation: existing.username.startsWith('g_') || existing.username.startsWith('guser')
    };
  }

  const userId = crypto.randomUUID();
  const characterId = crypto.randomUUID();
  const email = profile.email ?? `g_${profile.sub}@google.local`;
  const baseUsername = (profile.name || profile.given_name || 'g_user').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'guser';
  const username = await generateUniqueUsername(db, baseUsername);

  const characterStmt = await buildInitialCharacter(db, characterId, userId, username, SPECIAL_USERNAMES.includes(username.toLowerCase()));
  const batch = [
    db.prepare(`INSERT INTO users (id, email, username, email_verified, avatar_url)
                VALUES (?, ?, ?, ?, ?)`)
      .bind(userId, email, username, !!profile.email_verified, avatarUrl),
    db.prepare(`INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id, scope, raw_profile_json)
                VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), userId, 'google', profile.sub, 'openid email profile', rawProfileJson),
    characterStmt,
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
    avatar_url: avatarUrl || undefined
  };
}

export async function generateUniqueUsername(db: D1Database, base: string): Promise<string> {
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
export const SPECIAL_USERNAMES = ['trubone'];

// Helper to check and grant special account status
export async function checkAndGrantSpecialAccount(db: D1Database, userId: string, username: string): Promise<void> {
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

// Google Sign-In token exchange
auth.post('/google', zValidator('json', googleAuthSchema), async (c) => {
  const { credential } = c.req.valid('json');
  const db = c.env.DB;
  try {
    const profile = await verifyGoogleToken(credential, c.env.GOOGLE_CLIENT_ID);
    const user = await ensureUserFromGoogle(db, profile);

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
      }
    });
  } catch (err: any) {
    console.error('Google auth failed:', err?.message || err);
    return c.json({ error: err?.message || 'Google authentication failed' }, 401);
  }
});

// Magic Link - Request
auth.post('/magic-link/request', zValidator('json', magicLinkRequestSchema), async (c) => {
  const { email } = c.req.valid('json');
  const db = c.env.DB;
  const resendApiKey = c.env.RESEND_API_KEY;
  const appUrl = c.env.APP_URL || 'https://hwmnbn.me';

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return c.json({ error: 'Email service not configured' }, 500);
  }

  try {
    // Generate a secure token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Clean up old tokens for this email
    await db.prepare('DELETE FROM magic_link_tokens WHERE email = ? OR expires_at < CURRENT_TIMESTAMP')
      .bind(email)
      .run();

    // Store the token
    await db.prepare(
      'INSERT INTO magic_link_tokens (id, email, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), email, tokenHash, expiresAt).run();

    // Send the email via Resend
    const magicLink = `${appUrl}/auth/magic-link?token=${encodeURIComponent(token)}`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Me <noreply@hwmnbn.me>',
        to: [email],
        subject: 'Your login link',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #2d5a27; font-size: 48px; margin: 0 0 24px;">me</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px;">
              Click the button below to sign in to your account. This link expires in 15 minutes.
            </p>
            <a href="${magicLink}" style="display: inline-block; background-color: #2d5a27; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Sign In
            </a>
            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0;">
              If you didn't request this email, you can safely ignore it.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend API error:', errorData);
      return c.json({ error: 'Failed to send email' }, 500);
    }

    return c.json({ message: 'Magic link sent! Check your email.' });
  } catch (error) {
    console.error('Magic link request error:', error);
    return c.json({ error: 'An internal error occurred' }, 500);
  }
});

// Magic Link - Verify
auth.post('/magic-link/verify', zValidator('json', magicLinkVerifySchema), async (c) => {
  const { token } = c.req.valid('json');
  const db = c.env.DB;

  try {
    const tokenHash = await hashToken(token);

    // Find the token
    const tokenRecord = await db.prepare(`
      SELECT id, email, expires_at, used_at
      FROM magic_link_tokens
      WHERE token_hash = ?
    `).bind(tokenHash).first<{ id: string; email: string; expires_at: string; used_at: string | null }>();

    if (!tokenRecord) {
      return c.json({ error: 'Invalid or expired link' }, 401);
    }

    if (tokenRecord.used_at) {
      return c.json({ error: 'This link has already been used' }, 401);
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return c.json({ error: 'This link has expired' }, 401);
    }

    // Mark token as used
    await db.prepare('UPDATE magic_link_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(tokenRecord.id)
      .run();

    // Find or create user
    let user = await db.prepare(`
      SELECT u.id, u.email, u.username, c.id as characterId
      FROM users u
      LEFT JOIN characters c ON u.id = c.user_id
      WHERE u.email = ?
    `).bind(tokenRecord.email).first<{ id: string; email: string; username: string; characterId: string | null }>();

    let needsUsername = false;

    if (!user) {
      // Create new user
      const userId = crypto.randomUUID();
      const characterId = crypto.randomUUID();
      const baseUsername = tokenRecord.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'user';
      const username = await generateUniqueUsername(db, baseUsername);

      const characterStmt = await buildInitialCharacter(db, characterId, userId, username, SPECIAL_USERNAMES.includes(username.toLowerCase()));
    const batch = [
        db.prepare('INSERT INTO users (id, email, username, email_verified) VALUES (?, ?, ?, ?)')
          .bind(userId, tokenRecord.email, username, true),
        characterStmt,
        db.prepare('INSERT INTO trophies (character_id) VALUES (?)')
          .bind(characterId),
      ];
      await db.batch(batch);

      user = { id: userId, email: tokenRecord.email, username, characterId };
      needsUsername = true;
    }

    // Check and grant special account status if applicable
    await checkAndGrantSpecialAccount(db, user.id, user.username);

    // Create session
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
        needs_username_confirmation: needsUsername || user.username.startsWith('user'),
      }
    });
  } catch (error) {
    console.error('Magic link verify error:', error);
    return c.json({ error: 'An internal error occurred' }, 500);
  }
});

// Password Reset - Request
auth.post('/password-reset/request', zValidator('json', passwordResetRequestSchema), async (c) => {
  const { email } = c.req.valid('json');
  const db = c.env.DB;
  const resendApiKey = c.env.RESEND_API_KEY;
  const appUrl = c.env.APP_URL || 'https://hwmnbn.me';

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return c.json({ error: 'Email service not configured' }, 500);
  }

  try {
    // Check if user exists
    const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();

    // Always return success to prevent email enumeration
    if (!user) {
      return c.json({ message: 'If an account exists with that email, you will receive a password reset link.' });
    }

    // Generate a secure token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Clean up old tokens for this email
    await db.prepare('DELETE FROM magic_link_tokens WHERE email = ?')
      .bind(email)
      .run();

    // Store the token (reusing magic_link_tokens table)
    await db.prepare(
      'INSERT INTO magic_link_tokens (id, email, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), email, tokenHash, expiresAt).run();

    // Send the email via Resend
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Me <noreply@hwmnbn.me>',
        to: [email],
        subject: 'Reset your password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #2d5a27; font-size: 48px; margin: 0 0 24px;">me</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px;">
              You requested to reset your password. Click the button below to set a new password. This link expires in 1 hour.
            </p>
            <a href="${resetLink}" style="display: inline-block; background-color: #2d5a27; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0;">
              If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend API error:', errorData);
      return c.json({ error: 'Failed to send email' }, 500);
    }

    return c.json({ message: 'If an account exists with that email, you will receive a password reset link.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    return c.json({ error: 'An internal error occurred' }, 500);
  }
});

// Password Reset - Complete
auth.post('/password-reset/reset', zValidator('json', passwordResetSchema), async (c) => {
  const { token, password } = c.req.valid('json');
  const db = c.env.DB;

  try {
    const tokenHash = await hashToken(token);

    // Find the token
    const tokenRecord = await db.prepare(`
      SELECT id, email, expires_at, used_at
      FROM magic_link_tokens
      WHERE token_hash = ?
    `).bind(tokenHash).first<{ id: string; email: string; expires_at: string; used_at: string | null }>();

    if (!tokenRecord) {
      return c.json({ error: 'Invalid or expired reset link' }, 401);
    }

    if (tokenRecord.used_at) {
      return c.json({ error: 'This reset link has already been used' }, 401);
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return c.json({ error: 'This reset link has expired' }, 401);
    }

    // Mark token as used
    await db.prepare('UPDATE magic_link_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(tokenRecord.id)
      .run();

    // Find user and update password
    const user = await db.prepare('SELECT id FROM users WHERE email = ?')
      .bind(tokenRecord.email)
      .first<{ id: string }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Hash and update password
    const passwordHash = await hashPassword(password);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(passwordHash, user.id)
      .run();

    // Invalidate all existing sessions for security
    await db.prepare('DELETE FROM sessions WHERE user_id = ?')
      .bind(user.id)
      .run();

    return c.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    return c.json({ error: 'An internal error occurred' }, 500);
  }
});

// Change or create the current user's password (from account settings).
// Accounts created via Google / magic link have no password yet, so this also
// serves as "create a password" — in that case currentPassword is not required.
auth.post('/password/change', authMiddleware, zValidator('json', passwordChangeSchema), async (c) => {
  const authUser = c.get('user') as { id: string };
  const { currentPassword, newPassword } = c.req.valid('json');
  const db = c.env.DB;

  try {
    const row = await db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(authUser.id)
      .first<{ password_hash: string | null }>();

    if (!row) {
      return c.json({ error: 'User not found' }, 404);
    }

    const hadPassword = !!row.password_hash;

    // If the account already has a password, the current one must be supplied and correct.
    if (hadPassword) {
      if (!currentPassword) {
        return c.json({ error: 'Current password is required' }, 400);
      }
      const ok = await verifyPassword(currentPassword, row.password_hash!);
      if (!ok) {
        return c.json({ error: 'Current password is incorrect' }, 401);
      }
    }

    const newHash = await hashPassword(newPassword);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(newHash, authUser.id)
      .run();

    // Invalidate other sessions for security, but keep the caller logged in.
    const currentToken = getCookie(c, 'session_token');
    if (currentToken) {
      const keepHash = await hashToken(currentToken);
      await db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?')
        .bind(authUser.id, keepHash)
        .run();
    }

    return c.json({
      message: hadPassword ? 'Password changed successfully' : 'Password created successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    return c.json({ error: 'An internal error occurred' }, 500);
  }
});

// Phone login - request a one-time code.
//
// Always answers the same way whether or not the number belongs to an account,
// so this endpoint cannot be used to test which phone numbers are registered.
auth.post('/phone/request', zValidator('json', phoneCodeRequestSchema), async (c) => {
  const { phone: rawPhone } = c.req.valid('json');
  const db = c.env.DB;

  const smsConfig = {
    accountSid: c.env.TWILIO_ACCOUNT_SID,
    authToken: c.env.TWILIO_AUTH_TOKEN,
    fromNumber: c.env.TWILIO_FROM_NUMBER,
  };

  if (!isSmsConfigured(smsConfig)) {
    console.error('Twilio credentials not configured');
    return c.json({ error: 'SMS service not configured' }, 503);
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return c.json({ error: 'Enter a valid phone number' }, 400);
  }

  try {
    // One live code per number, and clear out anything expired while we are here.
    await db
      .prepare('DELETE FROM phone_verification_codes WHERE phone = ? OR expires_at < CURRENT_TIMESTAMP')
      .bind(phone)
      .run();

    const code = generateOtp(6);
    const codeHash = await hashToken(code + ':' + phone);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db
      .prepare('INSERT INTO phone_verification_codes (id, phone, code_hash, expires_at) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), phone, codeHash, expiresAt)
      .run();

    const sent = await sendSms(smsConfig, phone, `${code} is your code. It expires in 10 minutes.`);
    if (!sent.ok) {
      return c.json({ error: sent.error }, sent.status as 502 | 503);
    }

    return c.json({ message: `Code sent to ${maskPhone(phone)}`, phone });
  } catch (error) {
    console.error('Phone code request error:', error);
    return c.json({ error: 'An internal error occurred' }, 500);
  }
});

// Phone login - verify the code and sign in, creating the account on first use.
auth.post('/phone/verify', zValidator('json', phoneCodeVerifySchema), async (c) => {
  const { phone: rawPhone, code } = c.req.valid('json');
  const db = c.env.DB;

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return c.json({ error: 'Invalid code' }, 401);
  }

  const MAX_ATTEMPTS = 5;

  try {
    const record = await db
      .prepare(`SELECT id, code_hash, attempts FROM phone_verification_codes
                WHERE phone = ? AND expires_at > CURRENT_TIMESTAMP`)
      .bind(phone)
      .first<{ id: string; code_hash: string; attempts: number }>();

    if (!record) {
      return c.json({ error: 'Invalid code' }, 401);
    }

    // A 6-digit code is only safe with an attempt ceiling.
    if (record.attempts >= MAX_ATTEMPTS) {
      await db.prepare('DELETE FROM phone_verification_codes WHERE id = ?').bind(record.id).run();
      return c.json({ error: 'Too many attempts. Request a new code.' }, 429);
    }

    const codeHash = await hashToken(code + ':' + phone);
    if (codeHash !== record.code_hash) {
      await db
        .prepare('UPDATE phone_verification_codes SET attempts = attempts + 1 WHERE id = ?')
        .bind(record.id)
        .run();
      return c.json({ error: 'Invalid code' }, 401);
    }

    // Code is good and single-use.
    await db.prepare('DELETE FROM phone_verification_codes WHERE id = ?').bind(record.id).run();

    const pepper = c.env.PHONE_HASH_PEPPER;

    // If the caller is already signed in, this is "add my phone number to my
    // account", not "sign in" - attach it rather than creating a second account.
    const sessionCookie = getCookie(c, 'session_token');
    if (sessionCookie) {
      const session = await db
        .prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP')
        .bind(await hashToken(sessionCookie))
        .first<{ user_id: string }>();

      if (session) {
        const takenBy = await db
          .prepare('SELECT id FROM users WHERE phone = ? AND id != ?')
          .bind(phone, session.user_id)
          .first();
        if (takenBy) {
          return c.json({ error: 'That number is already on another account' }, 409);
        }

        const phoneHash = pepper ? await hashPhone(phone, pepper) : null;
        await db
          .prepare('UPDATE users SET phone = ?, phone_verified = TRUE, phone_hash = ? WHERE id = ?')
          .bind(phone, phoneHash, session.user_id)
          .run();

        const me = await db
          .prepare(`SELECT u.id, u.email, u.username, c.id as characterId
                    FROM users u LEFT JOIN characters c ON c.user_id = u.id
                    WHERE u.id = ?`)
          .bind(session.user_id)
          .first<{ id: string; email: string; username: string; characterId: string | null }>();

        return c.json({ data: { ...me, phone, needs_username_confirmation: false } });
      }
    }

    const existing = await db
      .prepare(`SELECT u.id, u.email, u.username, c.id as characterId
                FROM users u
                LEFT JOIN characters c ON c.user_id = u.id
                WHERE u.phone = ?`)
      .bind(phone)
      .first<{ id: string; email: string; username: string; characterId: string | null }>();

    let userId: string;
    let userData: { id: string; email: string; username: string; characterId: string | null; needs_username_confirmation: boolean };

    if (existing) {
      userId = existing.id;
      // Reaching here proves control of the number.
      await db.prepare('UPDATE users SET phone_verified = TRUE WHERE id = ?').bind(userId).run();
      userData = { ...existing, needs_username_confirmation: existing.username.startsWith('user') };
    } else {
      // First sign-in from this number: create the account the same way the
      // OAuth paths do, with a generated username the user is asked to confirm.
      userId = crypto.randomUUID();
      const characterId = crypto.randomUUID();
      const username = await generateUniqueUsername(db, 'user' + phone.slice(-4));
      const email = `${username}@phone.local`;
      const phoneHash = pepper ? await hashPhone(phone, pepper) : null;

      const characterStmt = await buildInitialCharacter(db, characterId, userId, username, false);
      await db.batch([
        db.prepare(`INSERT INTO users (id, email, username, phone, phone_verified, phone_hash)
                    VALUES (?, ?, ?, ?, TRUE, ?)`)
          .bind(userId, email, username, phone, phoneHash),
        characterStmt,
        db.prepare('INSERT INTO trophies (character_id) VALUES (?)').bind(characterId),
      ]);

      userData = { id: userId, email, username, characterId, needs_username_confirmation: true };
    }

    const sessionToken = await createSession(db, userId);
    setCookie(c, 'session_token', sessionToken, {
      httpOnly: true,
      secure: c.req.url.startsWith('https://'),
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ data: userData });
  } catch (error) {
    console.error('Phone verify error:', error);
    return c.json({ error: 'An internal error occurred' }, 500);
  }
});

export default auth;
