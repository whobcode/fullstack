import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Bindings } from '../bindings';
import { authMiddleware, AuthenticatedUser } from './middleware/auth';
import { updateProfileSchema } from '../shared/schemas/profile';

// We need to extend the Hono generic type to include the 'user' variable
// that our middleware adds to the context.
type App = {
  Bindings: Bindings;
  Variables: {
    user: AuthenticatedUser;
  };
};

const users = new Hono<App>();

// GET /api/users/me - Get the current authenticated user's profile and main character id
users.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const character = await db.prepare('SELECT id FROM characters WHERE user_id = ?').bind(user.id).first<{id: string}>();

  return c.json({ data: { ...user, characterId: character?.id } });
});

// PUT /api/users/me - Update the current authenticated user's profile
users.put(
  '/me',
  authMiddleware,
  zValidator('json', updateProfileSchema),
  async (c) => {
    const user = c.get('user');
    const { username, bio, avatar_url } = c.req.valid('json');
    const db = c.env.DB;

    // Check for username uniqueness if it's being changed
    if (username && username !== user.username) {
      const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
      if (existing) {
        return c.json({ error: 'Username is already taken' }, 409);
      }
    }

    try {
      await db
        .prepare(
          'UPDATE users SET username = ?, bio = ?, avatar_url = ? WHERE id = ?'
        )
        .bind(
          username || user.username,
          bio, // bio can be null
          avatar_url, // avatar_url can be null
          user.id
        )
        .run();

      return c.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Profile update error:', error);
      return c.json({ error: 'Failed to update profile' }, 500);
    }
  }
);

// GET /api/users/:id/profile - Get a public user profile
users.get('/:id/profile', async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;

  const profile = await db
    .prepare(
      'SELECT username, avatar_url, bio, created_at FROM users WHERE id = ?'
    )
    .bind(id)
    .first();

  if (!profile) {
    return c.json({ error: 'User not found' }, 404);
  }

  // We can also fetch and join social stats like post count, friend count etc. here
  // For now, just the basic profile is fine.

  return c.json({ data: profile });
});

export default users;
