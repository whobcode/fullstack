import { Router } from 'express';
import authRouter from './auth.js';
import usersRouter from './users.js';
import socialRouter from './social.js';
import friendsRouter from './friends.js';
import messagesRouter from './messages.js';
import gameRouter from './game.js';

const router = Router();

// API root endpoint
router.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Welcome to the Social RPG API (MEAN Stack Edition)!'
  });
});

// Mount route modules
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/social', socialRouter);
router.use('/friends', friendsRouter);
router.use('/messages', messagesRouter);
router.use('/game', gameRouter);

export default router;
