import { Hono } from 'hono';

const api = new Hono();

api.get('/', (c) => {
  return c.json({
    ok: true,
    message: 'Welcome to the Social RPG API!',
  });
});

// Import and mount the auth routes
import authRoutes from './auth';
import userRoutes from './users';

api.route('/auth', authRoutes);
api.route('/users', userRoutes);
import friendsRoutes from './friends';
api.route('/friends', friendsRoutes);
import gameRoutes from './game';
api.route('/game', gameRoutes);


export default api;
