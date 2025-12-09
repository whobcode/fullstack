/**
 * @module friends
 * This module exports a Hono app that handles friend requests and relationships.
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';
import { friendRequestSchema, respondToRequestSchema } from '../shared/schemas/friends';

type App = {
  Bindings: Bindings;
  Variables: {
    user: AuthenticatedUser;
  };
};

const friends = new Hono<App>();

// All routes in this file are protected
friends.use('*', authMiddleware);

/**
 * Sends a friend request to another user.
 * @param {object} c The Hono context object, containing the authenticated user and request body.
 * @returns {Promise<Response>} A JSON response confirming the request was sent or an error message.
 */
friends.post('/request', zValidator('json', friendRequestSchema), async (c) => {
  const user = c.get('user');
  const { addresseeId } = c.req.valid('json');
  const db = c.env.DB;

  if (user.id === addresseeId) {
    return c.json({ error: "You can't be friends with yourself" }, 400);
  }

  try {
    // Check if a relationship already exists
    const existing = await db.prepare('SELECT id FROM friends WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)')
      .bind(user.id, addresseeId, addresseeId, user.id)
      .first();

    if (existing) {
      return c.json({ error: 'A friend request already exists or you are already friends' }, 409);
    }

    await db.prepare('INSERT INTO friends (requester_id, addressee_id, status) VALUES (?, ?, ?)')
      .bind(user.id, addresseeId, 'pending')
      .run();

    // TODO: Create a notification for the addressee

    return c.json({ message: 'Friend request sent' }, 201);
  } catch (e) {
    console.error("Friend request error:", e);
    return c.json({ error: 'Failed to send friend request' }, 500);
  }
});

/**
 * Responds to a pending friend request.
 * @param {object} c The Hono context object, containing the authenticated user (the addressee) and request body.
 * @returns {Promise<Response>} A JSON response confirming the action.
 */
friends.post('/respond', zValidator('json', respondToRequestSchema), async (c) => {
    const user = c.get('user'); // This is the addressee
    const { requesterId, status } = c.req.valid('json');
    const db = c.env.DB;

    if (status === 'accepted') {
        await db.prepare('UPDATE friends SET status = ? WHERE requester_id = ? AND addressee_id = ? AND status = ?')
            .bind('accepted', requesterId, user.id, 'pending')
            .run();
    } else { // 'blocked' or could be 'declined'
        await db.prepare('DELETE FROM friends WHERE requester_id = ? AND addressee_id = ?')
            .bind(requesterId, user.id)
            .run();
    }

    // TODO: Create a notification for the requester about the response

    return c.json({ message: 'Friend request responded to' });
});

/**
 * Retrieves a list of the user's friends, including pending and accepted requests.
 * @param {object} c The Hono context object, containing the authenticated user.
 * @returns {Promise<Response>} A JSON response containing the list of friends.
 */
friends.get('/', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const friends = await db.prepare(`
        SELECT u.id, u.username, u.avatar_url, f.status, f.requester_id
        FROM friends f
        JOIN users u ON (f.requester_id = u.id OR f.addressee_id = u.id)
        WHERE (f.requester_id = ? OR f.addressee_id = ?) AND u.id != ?
    `).bind(user.id, user.id, user.id).all();

    return c.json({ data: friends.results });
});

/**
 * Removes a friend.
 * @param {object} c The Hono context object, containing the authenticated user and the friend's ID from the URL parameter.
 * @returns {Promise<Response>} A JSON response confirming the friend was removed.
 */
friends.delete('/:friendId', async (c) => {
    const user = c.get('user');
    const { friendId } = c.req.param();
    const db = c.env.DB;

    await db.prepare('DELETE FROM friends WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)')
        .bind(user.id, friendId, friendId, user.id)
        .run();

    return c.json({ message: 'Friend removed' });
});


export default friends;
