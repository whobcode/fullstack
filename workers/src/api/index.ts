import { Hono } from 'hono';
import type { Bindings } from '../bindings';

const api = new Hono<{ Bindings: Bindings }>();

api.get('/', (c) => {
  return c.json({
    ok: true,
    message: 'Welcome to the Social RPG API!',
  });
});

// Helper to create a request with the stripped path for lazy-loaded routes
function createStrippedRequest(c: { req: { raw: Request; path: string } }): Request {
  const url = new URL(c.req.raw.url);
  url.pathname = c.req.path;
  return new Request(url.toString(), c.req.raw);
}

// Core auth routes - always needed, load eagerly
import authRoutes from './auth';
import userRoutes from './users';
api.route('/auth', authRoutes);
api.route('/users', userRoutes);

// Social routes - lazy loaded
api.route('/social', new Hono<{ Bindings: Bindings }>().all('*', async (c) => {
  const { default: routes } = await import('./social');
  return routes.fetch(createStrippedRequest(c), c.env, c.executionCtx);
}));

api.route('/friends', new Hono<{ Bindings: Bindings }>().all('*', async (c) => {
  const { default: routes } = await import('./friends');
  return routes.fetch(createStrippedRequest(c), c.env, c.executionCtx);
}));

api.route('/messages', new Hono<{ Bindings: Bindings }>().all('*', async (c) => {
  const { default: routes } = await import('./messages');
  return routes.fetch(createStrippedRequest(c), c.env, c.executionCtx);
}));

// Game routes - lazy loaded
api.route('/game', new Hono<{ Bindings: Bindings }>().all('*', async (c) => {
  const { default: routes } = await import('./game');
  return routes.fetch(createStrippedRequest(c), c.env, c.executionCtx);
}));

api.route('/storm8', new Hono<{ Bindings: Bindings }>().all('*', async (c) => {
  const { default: routes } = await import('./storm8-battles');
  return routes.fetch(createStrippedRequest(c), c.env, c.executionCtx);
}));

// AI/Voice routes - lazy loaded (heavy dependencies)
api.route('/ai', new Hono<{ Bindings: Bindings }>().all('*', async (c) => {
  const { default: routes } = await import('./ai');
  return routes.fetch(createStrippedRequest(c), c.env, c.executionCtx);
}));

api.route('/voice', new Hono<{ Bindings: Bindings }>().all('*', async (c) => {
  const { default: routes } = await import('./voice');
  return routes.fetch(createStrippedRequest(c), c.env, c.executionCtx);
}));

// Media/Upload routes - lazy loaded
api.route('/upload', new Hono<{ Bindings: Bindings }>().all('*', async (c) => {
  const { default: routes } = await import('./upload');
  return routes.fetch(createStrippedRequest(c), c.env, c.executionCtx);
}));

// Payment routes - lazy loaded
api.route('/payments', new Hono<{ Bindings: Bindings }>().all('*', async (c) => {
  const { default: routes } = await import('./payments');
  return routes.fetch(createStrippedRequest(c), c.env, c.executionCtx);
}));

export default api;
