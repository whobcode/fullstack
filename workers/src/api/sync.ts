import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import type { AuthenticatedUser } from './middleware/auth';
import { getConnector, CONNECTORS, type NormalizedPost } from '../core/connectors';

type App = { Bindings: Bindings; Variables: { user: AuthenticatedUser } };
const sync = new Hono<App>();
sync.use('*', authMiddleware);

// List available providers and whether they work without OAuth/app review.
sync.get('/providers', (c) =>
  c.json({ data: Object.values(CONNECTORS).map((x) => ({ provider: x.provider, selfServe: x.selfServe })) })
);

// List the current user's connected accounts.
sync.get('/connections', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB
    .prepare('SELECT id, provider, handle, status, last_synced_at, last_error, created_at FROM social_connections WHERE user_id = ? ORDER BY created_at DESC')
    .bind(user.id).all();
  return c.json({ data: results });
});

const addConnectionSchema = z.object({
  provider: z.string().min(2),
  handle: z.string().min(1),
});

sync.post('/connections', zValidator('json', addConnectionSchema), async (c) => {
  const user = c.get('user');
  const { provider, handle } = c.req.valid('json');
  if (!getConnector(provider)) return c.json({ error: `Unknown provider "${provider}"` }, 400);
  const id = crypto.randomUUID();
  try {
    await c.env.DB
      .prepare('INSERT INTO social_connections (id, user_id, provider, handle) VALUES (?, ?, ?, ?)')
      .bind(id, user.id, provider, handle).run();
  } catch {
    return c.json({ error: 'That account is already connected' }, 409);
  }
  return c.json({ data: { id, provider, handle } }, 201);
});

sync.delete('/connections/:id', async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare('DELETE FROM social_connections WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).run();
  return c.json({ ok: true });
});

async function storePosts(db: D1Database, userId: string, connectionId: string | null, provider: string, posts: NormalizedPost[]): Promise<number> {
  let imported = 0;
  for (const p of posts.slice(0, 100)) {
    if (!p.externalId || !p.body) continue;
    const res = await db
      .prepare(`INSERT OR IGNORE INTO imported_posts (user_id, connection_id, provider, external_id, author_handle, body, url, posted_at, raw_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(userId, connectionId, provider, p.externalId, p.authorHandle ?? null, p.body, p.url ?? null, p.postedAt ?? null, p.raw ? JSON.stringify(p.raw) : null)
      .run();
    imported += res.meta.changes ?? 0;
  }
  return imported;
}

// Pull latest content for one connection via its connector.
sync.post('/connections/:id/sync', async (c) => {
  const user = c.get('user');
  const conn = await c.env.DB
    .prepare('SELECT id, provider, handle, access_token FROM social_connections WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id)
    .first<{ id: string; provider: string; handle: string; access_token: string | null }>();
  if (!conn) return c.json({ error: 'Connection not found' }, 404);

  const connector = getConnector(conn.provider);
  if (!connector) return c.json({ error: 'Unknown provider' }, 400);

  try {
    const posts = await connector.fetchPosts({ handle: conn.handle, accessToken: conn.access_token });
    const imported = await storePosts(c.env.DB, user.id, conn.id, conn.provider, posts);
    await c.env.DB.prepare('UPDATE social_connections SET last_synced_at = CURRENT_TIMESTAMP, status = ?, last_error = NULL WHERE id = ?')
      .bind('active', conn.id).run();
    return c.json({ data: { fetched: posts.length, imported } });
  } catch (e: any) {
    await c.env.DB.prepare('UPDATE social_connections SET status = ?, last_error = ? WHERE id = ?')
      .bind('error', String(e?.message ?? e), conn.id).run();
    return c.json({ error: String(e?.message ?? 'sync failed') }, 502);
  }
});

// Generic push import — for platforms (or your own integrations) to sync data INTO fullstack.
const importSchema = z.object({
  provider: z.string().min(2),
  posts: z.array(z.object({
    externalId: z.string(),
    authorHandle: z.string().optional(),
    body: z.string(),
    url: z.string().optional(),
    postedAt: z.string().optional(),
  })).max(100),
});

sync.post('/import', zValidator('json', importSchema), async (c) => {
  const user = c.get('user');
  const { provider, posts } = c.req.valid('json');
  const imported = await storePosts(c.env.DB, user.id, null, provider, posts);
  return c.json({ data: { received: posts.length, imported } });
});

// Unified imported feed for the user.
sync.get('/feed', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB
    .prepare('SELECT provider, author_handle, body, url, posted_at FROM imported_posts WHERE user_id = ? ORDER BY COALESCE(posted_at, imported_at) DESC LIMIT 50')
    .bind(user.id).all();
  return c.json({ data: results });
});

export default sync;
