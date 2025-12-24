import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import type { Bindings } from '../../bindings';
import { hashToken } from '../../lib/session';

// User type for authenticated context
export type AuthenticatedUser = {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  cover_photo_url?: string;
};

// We extend the Hono context with the user and variables
type AuthContext = {
  Variables: {
    user: AuthenticatedUser;
  };
};

export const authMiddleware = createMiddleware<AuthContext & { Bindings: Bindings }>(
  async (c, next) => {
    const sessionToken = getCookie(c, 'session_token');
    if (!sessionToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const tokenHash = await hashToken(sessionToken);
      const db = c.env.DB;

      const session = await db
        .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
        .bind(tokenHash)
        .first<{ user_id: string; expires_at: string }>();

      if (!session || new Date(session.expires_at) < new Date()) {
        if (session) {
            // Clean up expired session
            await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
        }
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const user = await db
        .prepare('SELECT id, email, username, avatar_url, bio, cover_photo_url FROM users WHERE id = ?')
        .bind(session.user_id)
        .first<AuthenticatedUser>();

      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      c.set('user', user);
      await next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return c.json({ error: 'An internal error occurred' }, 500);
    }
  }
);
