import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { deleteCookie } from 'hono/cookie';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';
import { updateProfileSchema } from '../shared/schemas/profile';
import {
  contactMatchSchema,
  locationUpdateSchema,
  discoverySettingsSchema,
  dismissSuggestionSchema,
} from '../shared/schemas/phone';
import { normalizePhone, hashPhone } from '../lib/phone';
import { encodeGeohash, GEOHASH_PRECISION } from '../lib/geo';

// Best-effort delete of an R2 object given its public URL (avatars/covers).
async function deleteMediaByUrl(env: Bindings, url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    const key = new URL(url).pathname.replace(/^\/+/, '');
    if (key) await env.MEDIA.delete(key);
  } catch {
    // Ignore malformed URLs / delete failures — not worth blocking account deletion.
  }
}

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
  const account = await db.prepare('SELECT (password_hash IS NOT NULL) AS has_password, shade_avatar_url, active_character_id, defense_character_id FROM users WHERE id = ?').bind(user.id).first<{ has_password: number; shade_avatar_url: string | null; active_character_id: string | null; defense_character_id: string | null }>();

  return c.json({ data: { ...user, characterId: character?.id, has_password: !!account?.has_password, shade_avatar_url: account?.shade_avatar_url ?? null, active_character_id: account?.active_character_id ?? null, defense_character_id: account?.defense_character_id ?? null } });
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

// DELETE /api/users/me - Permanently delete the current user's account.
// Removes everything tied to the account: the saved voice conversation (KV),
// uploaded media (R2), and the user row — which cascades to characters,
// sessions, posts, friends, etc. via ON DELETE CASCADE in D1.
users.delete('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  try {
    // 1. Voice assistant data in KV (same key scheme as the voice routes).
    await c.env.APP_CONFIG.delete(`voice:history:${user.id}`);

    // 2. Uploaded media in R2 (current avatar / cover / shade avatar).
    const media = await db
      .prepare('SELECT avatar_url, cover_photo_url, shade_avatar_url FROM users WHERE id = ?')
      .bind(user.id)
      .first<{ avatar_url: string | null; cover_photo_url: string | null; shade_avatar_url: string | null }>();
    if (media) {
      await deleteMediaByUrl(c.env, media.avatar_url);
      await deleteMediaByUrl(c.env, media.cover_photo_url);
      await deleteMediaByUrl(c.env, media.shade_avatar_url);
    }

    // 3. The user row (cascades to all related D1 tables).
    await db.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();

    // 4. Clear the session cookie on the client.
    deleteCookie(c, 'session_token');

    return c.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Account deletion error:', error);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

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

// GET /api/users/recommendations - Ranked friend suggestions.
//
// Signals, strongest first: someone already in the caller's matched contacts,
// then shared friends, then the same coarse location cell. Each suggestion
// carries the reason it surfaced so the UI can say why, rather than presenting
// an unexplained list of strangers.
users.get('/recommendations', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  try {
    const results = await db.prepare(`
      WITH me AS (
        SELECT location_geohash, discoverable_by_location
        FROM users WHERE id = ?1
      ),
      my_friends AS (
        SELECT CASE WHEN f.requester_id = ?1 THEN f.addressee_id ELSE f.requester_id END AS friend_id
        FROM friends f
        WHERE (f.requester_id = ?1 OR f.addressee_id = ?1) AND f.status = 'accepted'
      ),
      excluded AS (
        SELECT CASE WHEN f.requester_id = ?1 THEN f.addressee_id ELSE f.requester_id END AS id
        FROM friends f WHERE f.requester_id = ?1 OR f.addressee_id = ?1
        UNION SELECT suggested_user_id FROM suggestion_dismissals WHERE user_id = ?1
        UNION SELECT ?1
      ),
      mutuals AS (
        SELECT CASE WHEN f2.requester_id = mf.friend_id THEN f2.addressee_id ELSE f2.requester_id END AS id,
               COUNT(*) AS mutual_count
        FROM my_friends mf
        JOIN friends f2
          ON (f2.requester_id = mf.friend_id OR f2.addressee_id = mf.friend_id)
         AND f2.status = 'accepted'
        GROUP BY id
      )
      SELECT
        u.id,
        u.username,
        u.avatar_url,
        CASE WHEN cm.matched_user_id IS NOT NULL THEN 1 ELSE 0 END AS from_contacts,
        COALESCE(mu.mutual_count, 0) AS mutual_friends,
        CASE
          WHEN u.discoverable_by_location = 1
           AND me.location_geohash IS NOT NULL
           AND u.location_geohash = me.location_geohash
          THEN 1 ELSE 0
        END AS nearby
      FROM users u
      CROSS JOIN me
      LEFT JOIN contact_matches cm ON cm.user_id = ?1 AND cm.matched_user_id = u.id
      LEFT JOIN mutuals mu ON mu.id = u.id
      WHERE u.id NOT IN (SELECT id FROM excluded)
        AND COALESCE(u.is_bot, 0) = 0
      ORDER BY from_contacts DESC, mutual_friends DESC, nearby DESC, RANDOM()
      LIMIT 12
    `).bind(user.id).all<{
      id: string;
      username: string;
      avatar_url: string | null;
      from_contacts: number;
      mutual_friends: number;
      nearby: number;
    }>();

    const data = (results.results ?? []).map(r => ({
      id: r.id,
      username: r.username,
      avatar_url: r.avatar_url,
      from_contacts: Boolean(r.from_contacts),
      mutual_friends: r.mutual_friends,
      nearby: Boolean(r.nearby),
      reason: r.from_contacts
        ? 'In your contacts'
        : r.mutual_friends > 0
          ? `${r.mutual_friends} mutual friend${r.mutual_friends === 1 ? '' : 's'}`
          : r.nearby
            ? 'Near you'
            : 'Suggested for you',
    }));

    return c.json({ data });
  } catch (error) {
    // Deploys and D1 migrations are applied by separate steps, so a release can
    // briefly run this code against a database that predates migration 0018.
    // Fall back to the plain suggestion list rather than failing the page.
    console.error('Ranked recommendations unavailable, falling back:', error);

    try {
      const fallback = await db.prepare(`
        SELECT u.id, u.username, u.avatar_url
        FROM users u
        WHERE u.id != ?
          AND u.id NOT IN (
            SELECT CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
            FROM friends f
            WHERE f.requester_id = ? OR f.addressee_id = ?
          )
        ORDER BY RANDOM()
        LIMIT 6
      `).bind(user.id, user.id, user.id, user.id).all<{ id: string; username: string; avatar_url: string | null }>();

      return c.json({
        data: (fallback.results ?? []).map(r => ({
          ...r,
          from_contacts: false,
          mutual_friends: 0,
          nearby: false,
          reason: 'Suggested for you',
        })),
      });
    } catch (fallbackError) {
      console.error('Recommendations error:', fallbackError);
      return c.json({ error: 'Failed to load suggestions' }, 500);
    }
  }
});

// POST /api/users/contacts/match - Find which of the caller's contacts are here.
//
// The uploaded numbers are normalized, hashed with the server-side pepper and
// matched in-request. Only the resulting edges are stored: the address book
// itself is never written to the database. Users who have turned off phone
// discovery are excluded from matching entirely.
users.post('/contacts/match', authMiddleware, zValidator('json', contactMatchSchema), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const pepper = c.env.PHONE_HASH_PEPPER;

  if (!pepper) {
    console.error('PHONE_HASH_PEPPER not configured');
    return c.json({ error: 'Contact discovery not configured' }, 503);
  }

  const { phones } = c.req.valid('json');

  try {
    const hashes = new Set<string>();
    for (const raw of phones) {
      const e164 = normalizePhone(raw);
      if (e164) hashes.add(await hashPhone(e164, pepper));
    }

    if (hashes.size === 0) {
      return c.json({ data: [], matched: 0 });
    }

    // Chunked so the SQL variable count stays sane on large address books.
    const CHUNK = 100;
    const list = [...hashes];
    const matches: { id: string; username: string; avatar_url: string | null }[] = [];

    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK);
      const placeholders = chunk.map(() => '?').join(',');
      const found = await db
        .prepare(`SELECT id, username, avatar_url FROM users
                  WHERE phone_hash IN (${placeholders})
                    AND discoverable_by_phone = 1
                    AND id != ?`)
        .bind(...chunk, user.id)
        .all<{ id: string; username: string; avatar_url: string | null }>();
      if (found.results) matches.push(...found.results);
    }

    if (matches.length > 0) {
      const CONTACT_CHUNK = 50;
      for (let i = 0; i < matches.length; i += CONTACT_CHUNK) {
        await db.batch(
          matches.slice(i, i + CONTACT_CHUNK).map(m =>
            db
              .prepare('INSERT OR IGNORE INTO contact_matches (user_id, matched_user_id) VALUES (?, ?)')
              .bind(user.id, m.id)
          )
        );
      }
    }

    return c.json({ data: matches, matched: matches.length });
  } catch (error) {
    console.error('Contact match error:', error);
    return c.json({ error: 'Failed to match contacts' }, 500);
  }
});

// PUT /api/users/me/location - Record a coarse location for "near you".
// Only the geohash cell is kept; the coordinates themselves are discarded.
users.put('/me/location', authMiddleware, zValidator('json', locationUpdateSchema), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const { latitude, longitude } = c.req.valid('json');

  try {
    const geohash = encodeGeohash(latitude, longitude, GEOHASH_PRECISION.METRO);

    await db
      .prepare(`UPDATE users
                SET location_geohash = ?, location_updated_at = CURRENT_TIMESTAMP,
                    discoverable_by_location = 1
                WHERE id = ?`)
      .bind(geohash, user.id)
      .run();

    return c.json({ message: 'Location updated' });
  } catch (error) {
    console.error('Location update error:', error);
    return c.json({ error: 'Failed to update location' }, 500);
  }
});

// DELETE /api/users/me/location - Stop sharing location and forget the cell.
users.delete('/me/location', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  await db
    .prepare(`UPDATE users
              SET location_geohash = NULL, location_updated_at = NULL,
                  discoverable_by_location = 0
              WHERE id = ?`)
    .bind(user.id)
    .run();

  return c.json({ message: 'Location sharing turned off' });
});

// GET/PUT /api/users/me/discovery - Read and change the discovery toggles.
users.get('/me/discovery', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  let row: { phone: string | null; phone_verified: number; discoverable_by_phone: number; discoverable_by_location: number } | null = null;

  try {
    row = await db
      .prepare(`SELECT phone, phone_verified, discoverable_by_phone, discoverable_by_location
                FROM users WHERE id = ?`)
      .bind(user.id)
      .first<{ phone: string | null; phone_verified: number; discoverable_by_phone: number; discoverable_by_location: number }>();
  } catch (error) {
    // Columns land with migration 0018; report everything off until then.
    console.error('Discovery columns unavailable:', error);
  }

  return c.json({
    data: {
      phone: row?.phone ?? null,
      phone_verified: Boolean(row?.phone_verified),
      discoverable_by_phone: Boolean(row?.discoverable_by_phone),
      discoverable_by_location: Boolean(row?.discoverable_by_location),
    },
  });
});

users.put('/me/discovery', authMiddleware, zValidator('json', discoverySettingsSchema), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const { discoverable_by_phone, discoverable_by_location } = c.req.valid('json');

  const sets: string[] = [];
  const values: (number | string)[] = [];

  if (discoverable_by_phone !== undefined) {
    sets.push('discoverable_by_phone = ?');
    values.push(discoverable_by_phone ? 1 : 0);
  }
  if (discoverable_by_location !== undefined) {
    sets.push('discoverable_by_location = ?');
    values.push(discoverable_by_location ? 1 : 0);
    // Turning location discovery off should also drop the stored cell.
    if (!discoverable_by_location) {
      sets.push('location_geohash = NULL', 'location_updated_at = NULL');
    }
  }

  if (sets.length === 0) {
    return c.json({ message: 'Nothing to update' });
  }

  await db
    .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values, user.id)
    .run();

  return c.json({ message: 'Discovery settings updated' });
});

// POST /api/users/suggestions/dismiss - Stop suggesting someone.
users.post('/suggestions/dismiss', authMiddleware, zValidator('json', dismissSuggestionSchema), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const { userId } = c.req.valid('json');

  await db
    .prepare('INSERT OR IGNORE INTO suggestion_dismissals (user_id, suggested_user_id) VALUES (?, ?)')
    .bind(user.id, userId)
    .run();

  return c.json({ message: 'Suggestion dismissed' });
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
