/**
 * @module social
 * This module exports a Hono app for social features like posts, comments, reactions, and groups.
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';
import { createCommentSchema, createPostSchema, reactSchema } from '../shared/schemas/social';

type App = {
  Bindings: Bindings;
  Variables: { user: AuthenticatedUser };
};

const social = new Hono<App>();

/**
 * Retrieves the public feed of posts.
 * @param {object} c - The Hono context object.
 * @returns {Promise<Response>} A JSON response containing the latest posts.
 */
social.get('/posts', async (c) => {
  const db = c.env.DB;
  const { results } = await db
    .prepare(
      `SELECT p.id, p.body, p.created_at,
              u.username as author_username, u.avatar_url as author_avatar,
              (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'like') AS likes,
              (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'hype') AS hype,
              (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'gg') AS gg,
              (SELECT COUNT(*) FROM comments c2 WHERE c2.post_id = p.id) AS comments
       FROM posts p
       JOIN users u ON u.id = p.author_id
       ORDER BY p.created_at DESC
       LIMIT 25`
    )
    .all();

  return c.json({ data: results });
});

/**
 * Retrieves the comments for a specific post.
 * @param {object} c - The Hono context object.
 * @returns {Promise<Response>} A JSON response containing the comments for the post.
 */
social.get('/posts/:id/comments', async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();
  const { results } = await db
    .prepare(
      `SELECT c.id, c.body, c.created_at, u.username as author_username, u.avatar_url as author_avatar
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`
    )
    .bind(id)
    .all();

  return c.json({ data: results });
});

// Protected routes below
social.use('*', authMiddleware);

/**
 * Creates a new post.
 * @param {object} c - The Hono context object.
 * @returns {Promise<Response>} A JSON response containing the new post's ID and body.
 */
social.post('/posts', zValidator('json', createPostSchema), async (c) => {
  const user = c.get('user');
  const { body } = c.req.valid('json');
  const db = c.env.DB;

  const id = crypto.randomUUID().replace(/-/g, '').toLowerCase();
  await db
    .prepare('INSERT INTO posts (id, author_id, body) VALUES (?, ?, ?)')
    .bind(id, user.id, body)
    .run();

  return c.json({ data: { id, body } }, 201);
});

/**
 * Creates a new comment on a post.
 * @param {object} c - The Hono context object.
 * @returns {Promise<Response>} A JSON response containing the new comment's ID.
 */
social.post('/posts/:id/comments', zValidator('json', createCommentSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const { body } = c.req.valid('json');
  const db = c.env.DB;

  const commentId = crypto.randomUUID().replace(/-/g, '').toLowerCase();
  await db
    .prepare('INSERT INTO comments (id, post_id, author_id, body) VALUES (?, ?, ?, ?)')
    .bind(commentId, id, user.id, body)
    .run();

  return c.json({ data: { id: commentId } }, 201);
});

/**
 * Adds a reaction to a post.
 * @param {object} c - The Hono context object.
 * @returns {Promise<Response>} A JSON response indicating success.
 */
social.post('/posts/:id/react', zValidator('json', reactSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const { type } = c.req.valid('json');
  const db = c.env.DB;

  // Upsert reaction
  await db
    .prepare('DELETE FROM reactions WHERE post_id = ? AND user_id = ?')
    .bind(id, user.id)
    .run();

  const reactionId = crypto.randomUUID().replace(/-/g, '').toLowerCase();
  await db
    .prepare('INSERT INTO reactions (id, post_id, user_id, type) VALUES (?, ?, ?, ?)')
    .bind(reactionId, id, user.id, type)
    .run();

  return c.json({ message: 'Reacted' }, 201);
});

/**
 * Retrieves a list of groups.
 * @param {object} c - The Hono context object.
 * @returns {Promise<Response>} A JSON response containing a list of groups.
 */
social.get('/groups', async (c) => {
  const db = c.env.DB;
  const { results } = await db
    .prepare(
      `SELECT g.id, g.name, g.description, g.created_at, u.username as owner_username,
              (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as members
       FROM groups g
       JOIN users u ON u.id = g.owner_id
       ORDER BY g.created_at DESC
       LIMIT 25`
    )
    .all();
  return c.json({ data: results });
});

/**
 * Joins a group.
 * @param {object} c - The Hono context object.
 * @returns {Promise<Response>} A JSON response indicating success.
 */
social.post('/groups/:id/join', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = c.env.DB;

  await db
    .prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)')
    .bind(id, user.id)
    .run();

  return c.json({ message: 'Joined group' }, 201);
});

export default social;
