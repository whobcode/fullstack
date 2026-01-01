import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Friend } from '../models/Friend.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const sendMessageSchema = z.object({
  body: z.string().min(1).max(2000)
});

// Get conversations list
router.get('/conversations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get unique conversation partners
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { recipientId: userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', userId] },
              '$recipientId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipientId', userId] },
                    { $eq: ['$readAt', null] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get user details for conversation partners
    const partnerIds = messages.map(m => m._id);
    const partners = await User.find({ _id: { $in: partnerIds } })
      .select('username avatarUrl');

    const partnerMap = new Map(
      partners.map(p => [p._id.toString(), p])
    );

    const conversations = messages.map(m => ({
      partnerId: m._id,
      partner: partnerMap.get(m._id.toString()),
      lastMessage: {
        id: m.lastMessage._id,
        body: m.lastMessage.body,
        createdAt: m.lastMessage.createdAt,
        isMine: m.lastMessage.senderId.toString() === userId
      },
      unreadCount: m.unreadCount
    }));

    res.json({ data: conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Get messages with a specific user
router.get('/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const partnerId = req.params.userId;
    const { limit = '50', cursor } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10), 100);

    let query: any = {
      $or: [
        { senderId: currentUserId, recipientId: partnerId },
        { senderId: partnerId, recipientId: currentUserId }
      ]
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor as string) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum);

    // Mark unread messages as read
    await Message.updateMany(
      {
        senderId: partnerId,
        recipientId: currentUserId,
        readAt: null
      },
      { $set: { readAt: new Date() } }
    );

    const formattedMessages = messages.map(m => ({
      id: m._id,
      body: m.body,
      createdAt: m.createdAt,
      readAt: m.readAt,
      isMine: m.senderId.toString() === currentUserId
    }));

    const nextCursor = messages.length === limitNum
      ? messages[messages.length - 1].createdAt.toISOString()
      : null;

    res.json({
      data: formattedMessages.reverse(), // Return in chronological order
      nextCursor
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Send a message
router.post('/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const senderId = req.user!.id;
    const recipientId = req.params.userId;

    if (senderId === recipientId) {
      res.status(400).json({ error: 'Cannot send message to yourself' });
      return;
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }

    // Optional: Check if they are friends
    const friendship = await Friend.findOne({
      $or: [
        { requesterId: senderId, addresseeId: recipientId },
        { requesterId: recipientId, addresseeId: senderId }
      ],
      status: 'accepted'
    });

    // You can uncomment this to require friendship for messaging
    // if (!friendship) {
    //   res.status(403).json({ error: 'You must be friends to send messages' });
    //   return;
    // }

    const message = await Message.create({
      senderId,
      recipientId,
      body: validation.data.body
    });

    res.status(201).json({
      data: {
        id: message._id,
        body: message.body,
        createdAt: message.createdAt,
        isMine: true
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

export default router;
