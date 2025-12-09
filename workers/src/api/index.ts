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
import socialRoutes from './social';
import friendsRoutes from './friends';
import gameRoutes from './game';
import storm8Routes from './storm8-battles';

api.route('/auth', authRoutes);
api.route('/users', userRoutes);
api.route('/friends', friendsRoutes);
api.route('/game', gameRoutes);
api.route('/social', socialRoutes);
api.route('/storm8', storm8Routes);


export default api;
