import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie } from 'hono/cookie';
import { Bindings } from '../bindings';
import { loginSchema, registerSchema } from '../shared/schemas/auth';
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
import { deleteCookie } from 'hono/cookie';
import { hashToken } from '../lib/session';

auth.post('/logout', authMiddleware, async (c) => {
    const sessionToken = c.req.cookie('session_token');
    const db = c.env.DB;

    if (sessionToken) {
        const tokenHash = await hashToken(sessionToken);
        await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    }

    deleteCookie(c, 'session_token');
    return c.json({ message: 'Logged out successfully' });
});


export default auth;
