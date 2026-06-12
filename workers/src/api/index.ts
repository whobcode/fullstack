import { Hono } from 'hono';
import type { Bindings } from '../bindings';

const api = new Hono<{ Bindings: Bindings }>();

api.get('/', (c) => {
  return c.json({
    ok: true,
    message: 'Welcome to the Social RPG API!',
  });
});

// Build a lazy-loaded mount for a sub-router. The sub-routers define their
// paths relative to their own root (e.g. `/feed`, `/characters`), so before we
// hand the request to them we must strip the `/api/<section>` prefix that this
// router was mounted under — otherwise nothing matches and Hono returns a
// plain-text 404 (which the frontend surfaces as "Invalid response from server").
function lazyRoute(
  basePath: string,
  // Sub-routers vary in their Variables (some add `user` via auth middleware),
  // so accept any Hono instance here — we only call its `fetch`.
  importer: () => Promise<{ default: Hono<any, any, any> }>,
) {
  return new Hono<{ Bindings: Bindings }>().all('*', async (c) => {
    const { default: routes } = await importer();
    const url = new URL(c.req.raw.url);
    url.pathname = url.pathname.slice(basePath.length) || '/';
    return routes.fetch(new Request(url.toString(), c.req.raw), c.env, c.executionCtx);
  });
}

// Core auth routes - always needed, load eagerly
import authRoutes from './auth';
import userRoutes from './users';
// Social OAuth (GitHub/Discord redirect flow) - lazy loaded. Mounted before
// `/auth` so /auth/oauth/* resolves to this router rather than the auth router.
api.route('/auth/oauth', lazyRoute('/api/auth/oauth', () => import('./oauth')));
api.route('/auth', authRoutes);
api.route('/users', userRoutes);

// Social routes - lazy loaded
api.route('/social', lazyRoute('/api/social', () => import('./social')));
api.route('/friends', lazyRoute('/api/friends', () => import('./friends')));
api.route('/messages', lazyRoute('/api/messages', () => import('./messages')));

// Game routes - lazy loaded
api.route('/game', lazyRoute('/api/game', () => import('./game')));
api.route('/storm8', lazyRoute('/api/storm8', () => import('./storm8-battles')));

// AI/Voice routes - lazy loaded (heavy dependencies)
api.route('/ai', lazyRoute('/api/ai', () => import('./ai')));
api.route('/voice', lazyRoute('/api/voice', () => import('./voice')));

// Media/Upload routes - lazy loaded
api.route('/upload', lazyRoute('/api/upload', () => import('./upload')));

// Payment routes - lazy loaded
api.route('/payments', lazyRoute('/api/payments', () => import('./payments')));

// Cross-platform sync routes - lazy loaded
api.route('/sync', lazyRoute('/api/sync', () => import('./sync')));

export default api;
