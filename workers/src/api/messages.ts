import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';

type App = {
  Bindings: Bindings;
  Variables: { user: AuthenticatedUser };
};

const sendMessageSchema = z.object({
  recipientId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

const messages = new Hono<App>();

// All routes require authentication
messages.use('*', authMiddleware);

// Get all conversations (list of users the current user has messaged with)
messages.get('/conversations', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // Get list of conversation partners with their latest message
  const { results } = await db
    .prepare(
      `WITH conversation_users AS (
        SELECT DISTINCT
          CASE
            WHEN sender_id = ? THEN recipient_id
            ELSE sender_id
          END as other_user_id
        FROM messages
        WHERE sender_id = ? OR recipient_id = ?
      )
      SELECT
        u.id,
        u.username,
        u.avatar_url,
        (
          SELECT body FROM messages m
          WHERE (m.sender_id = ? AND m.recipient_id = u.id)
             OR (m.sender_id = u.id AND m.recipient_id = ?)
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at FROM messages m
          WHERE (m.sender_id = ? AND m.recipient_id = u.id)
             OR (m.sender_id = u.id AND m.recipient_id = ?)
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message_at,
        (
          SELECT COUNT(*) FROM messages m
          WHERE m.sender_id = u.id AND m.recipient_id = ? AND m.read_at IS NULL
        ) as unread_count
      FROM conversation_users cu
      JOIN users u ON u.id = cu.other_user_id
      ORDER BY last_message_at DESC`
    )
    .bind(user.id, user.id, user.id, user.id, user.id, user.id, user.id, user.id)
    .all();

  return c.json({ data: results });
});

// Get messages with a specific user
messages.get('/conversations/:userId', async (c) => {
  const user = c.get('user');
  const { userId } = c.req.param();
  const db = c.env.DB;

  // Get the other user's info
  const otherUser = await db
    .prepare('SELECT id, username, avatar_url FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!otherUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Get messages between the two users
  const { results } = await db
    .prepare(
      `SELECT m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.read_at,
              u.username as sender_username, u.avatar_url as sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id = ? AND m.recipient_id = ?)
          OR (m.sender_id = ? AND m.recipient_id = ?)
       ORDER BY m.created_at ASC`
    )
    .bind(user.id, userId, userId, user.id)
    .all();

  // Mark all messages from the other user as read
  await db
    .prepare(
      `UPDATE messages SET read_at = CURRENT_TIMESTAMP
       WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL`
    )
    .bind(userId, user.id)
    .run();

  return c.json({ data: { user: otherUser, messages: results } });
});

// Send a message
messages.post('/', zValidator('json', sendMessageSchema), async (c) => {
  const user = c.get('user');
  const { recipientId, body } = c.req.valid('json');
  const db = c.env.DB;

  if (recipientId === user.id) {
    return c.json({ error: "You can't send messages to yourself" }, 400);
  }

  // Check recipient exists
  const recipient = await db
    .prepare('SELECT id FROM users WHERE id = ?')
    .bind(recipientId)
    .first();

  if (!recipient) {
    return c.json({ error: 'Recipient not found' }, 404);
  }

  const id = crypto.randomUUID().replace(/-/g, '').toLowerCase();
  await db
    .prepare('INSERT INTO messages (id, sender_id, recipient_id, body) VALUES (?, ?, ?, ?)')
    .bind(id, user.id, recipientId, body)
    .run();

  return c.json({ data: { id, body, created_at: new Date().toISOString() } }, 201);
});

// Mark a message as read
messages.put('/:id/read', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = c.env.DB;

  await db
    .prepare(
      `UPDATE messages SET read_at = CURRENT_TIMESTAMP
       WHERE id = ? AND recipient_id = ?`
    )
    .bind(id, user.id)
    .run();

  return c.json({ message: 'Message marked as read' });
});

export default messages;
