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
import messagesRoutes from './messages';
import gameRoutes from './game';
import storm8Routes from './storm8-battles';
import aiRoutes from './ai';
import paymentRoutes from './payments';
import voiceRoutes from './voice';
import uploadRoutes from './upload';

api.route('/auth', authRoutes);
api.route('/users', userRoutes);
api.route('/friends', friendsRoutes);
api.route('/messages', messagesRoutes);
api.route('/game', gameRoutes);
api.route('/social', socialRoutes);
api.route('/storm8', storm8Routes);
api.route('/ai', aiRoutes);
api.route('/payments', paymentRoutes);
api.route('/voice', voiceRoutes);
api.route('/upload', uploadRoutes);

export default api;
