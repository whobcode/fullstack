import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Friend } from '../models/Friend.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get friends list
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const friendships = await Friend.find({
      $or: [
        { requesterId: userId, status: 'accepted' },
        { addresseeId: userId, status: 'accepted' }
      ]
    });

    const friendIds = friendships.map(f =>
      f.requesterId.toString() === userId
        ? f.addresseeId
        : f.requesterId
    );

    const friends = await User.find({ _id: { $in: friendIds } })
      .select('username avatarUrl');

    res.json({ data: friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Get pending friend requests
router.get('/requests', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Incoming requests
    const incoming = await Friend.find({
      addresseeId: userId,
      status: 'pending'
    }).populate('requesterId', 'username avatarUrl');

    // Outgoing requests
    const outgoing = await Friend.find({
      requesterId: userId,
      status: 'pending'
    }).populate('addresseeId', 'username avatarUrl');

    res.json({
      data: {
        incoming: incoming.map(f => ({
          id: f._id,
          user: {
            id: (f.requesterId as any)._id,
            username: (f.requesterId as any).username,
            avatarUrl: (f.requesterId as any).avatarUrl
          },
          createdAt: f.createdAt
        })),
        outgoing: outgoing.map(f => ({
          id: f._id,
          user: {
            id: (f.addresseeId as any)._id,
            username: (f.addresseeId as any).username,
            avatarUrl: (f.addresseeId as any).avatarUrl
          },
          createdAt: f.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Send friend request
router.post('/request/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const requesterId = req.user!.id;
    const addresseeId = req.params.userId;

    if (requesterId === addresseeId) {
      res.status(400).json({ error: 'Cannot send friend request to yourself' });
      return;
    }

    // Check if addressee exists
    const addressee = await User.findById(addresseeId);
    if (!addressee) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check for existing friendship
    const existing = await Friend.findOne({
      $or: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId }
      ]
    });

    if (existing) {
      if (existing.status === 'accepted') {
        res.status(400).json({ error: 'Already friends' });
        return;
      }
      if (existing.status === 'pending') {
        res.status(400).json({ error: 'Friend request already pending' });
        return;
      }
      if (existing.status === 'blocked') {
        res.status(400).json({ error: 'Cannot send friend request' });
        return;
      }
    }

    // Create friend request
    const friendship = await Friend.create({
      requesterId,
      addresseeId,
      status: 'pending'
    });

    // Create notification
    await Notification.create({
      userId: addresseeId,
      type: 'friend_request',
      payload: {
        fromUserId: requesterId,
        fromUsername: req.user!.username,
        friendshipId: friendship._id
      }
    });

    res.status(201).json({ message: 'Friend request sent' });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Accept friend request
router.post('/accept/:requestId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const friendship = await Friend.findOne({
      _id: req.params.requestId,
      addresseeId: userId,
      status: 'pending'
    });

    if (!friendship) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    friendship.status = 'accepted';
    await friendship.save();

    // Notify the requester
    await Notification.create({
      userId: friendship.requesterId,
      type: 'friend_accepted',
      payload: {
        fromUserId: userId,
        fromUsername: req.user!.username
      }
    });

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Reject friend request
router.post('/reject/:requestId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await Friend.deleteOne({
      _id: req.params.requestId,
      addresseeId: userId,
      status: 'pending'
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Remove friend
router.delete('/:friendId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const friendId = req.params.friendId;

    const result = await Friend.deleteOne({
      $or: [
        { requesterId: userId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: userId }
      ],
      status: 'accepted'
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Friendship not found' });
      return;
    }

    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

export default router;
