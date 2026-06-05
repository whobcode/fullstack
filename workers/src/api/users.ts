import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';
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

// Fetch a user's showcase character card (highest-level set-up character).
async function getCharacterCard(db: D1Database, userId: string) {
  return db
    .prepare(
      `SELECT c.gamertag, c.class, c.level, c.xp, c.slot_number,
              c.hp, c.atk, c.def, c.mp, c.spd,
              COALESCE(t.wins,0) AS wins, COALESCE(t.losses,0) AS losses,
              COALESCE(t.kills,0) AS kills, COALESCE(t.deaths,0) AS deaths
       FROM characters c
       LEFT JOIN trophies t ON t.character_id = c.id
       WHERE c.user_id = ? AND c.first_game_access_completed = TRUE
       ORDER BY c.level DESC, c.slot_number ASC
       LIMIT 1`
    )
    .bind(userId)
    .first();
}


// GET /api/users/me - Get the current authenticated user's profile and main character id
users.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const character = await db.prepare('SELECT id FROM characters WHERE user_id = ?').bind(user.id).first<{id: string}>();
  const account = await db.prepare('SELECT (password_hash IS NOT NULL) AS has_password, shade_avatar_url FROM users WHERE id = ?').bind(user.id).first<{ has_password: number; shade_avatar_url: string | null }>();

  return c.json({ data: { ...user, characterId: character?.id, has_password: !!account?.has_password, shade_avatar_url: account?.shade_avatar_url ?? null } });
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

// GET /api/users/search - Search for users (for friend recommendations)
users.get('/search', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const query = c.req.query('q') || '';

  // Get users that match the query and aren't already friends/pending
  const results = await db.prepare(`
    SELECT u.id, u.username, u.avatar_url
    FROM users u
    WHERE u.id != ?
      AND u.username LIKE ?
      AND u.id NOT IN (
        SELECT CASE
          WHEN f.requester_id = ? THEN f.addressee_id
          ELSE f.requester_id
        END
        FROM friends f
        WHERE f.requester_id = ? OR f.addressee_id = ?
      )
    LIMIT 10
  `).bind(user.id, `%${query}%`, user.id, user.id, user.id).all();

  return c.json({ data: results.results });
});

// GET /api/users/recommendations - Get friend recommendations
users.get('/recommendations', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // Get users that aren't already friends/pending (random selection)
  const results = await db.prepare(`
    SELECT u.id, u.username, u.avatar_url
    FROM users u
    WHERE u.id != ?
      AND u.id NOT IN (
        SELECT CASE
          WHEN f.requester_id = ? THEN f.addressee_id
          ELSE f.requester_id
        END
        FROM friends f
        WHERE f.requester_id = ? OR f.addressee_id = ?
      )
    ORDER BY RANDOM()
    LIMIT 6
  `).bind(user.id, user.id, user.id, user.id).all();

  return c.json({ data: results.results });
});

// GET /api/users/:id/profile - Get a public user profile
users.get('/:id/profile', async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;

  const profile = await db
    .prepare(
      'SELECT username, avatar_url, bio, cover_photo_url, created_at FROM users WHERE id = ?'
    )
    .bind(id)
    .first();

  if (!profile) {
    return c.json({ error: 'User not found' }, 404);
  }

  const character = await getCharacterCard(db, id);
  return c.json({ data: { ...profile, character } });
});

// GET /api/users/:id/character-card - Public RPG character card for a user
users.get('/:id/character-card', async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;
  const character = await getCharacterCard(db, id);
  if (!character) return c.json({ error: 'No character found' }, 404);
  return c.json({ data: character });
});

export default users;
