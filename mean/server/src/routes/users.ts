import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Character } from '../models/Character.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional()
});

// Get user profile by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const character = await Character.findOne({ userId: user._id, slotIndex: 0 });

    res.json({
      data: {
        id: user._id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
        character: character ? {
          id: character._id,
          gamertag: character.gamertag,
          class: character.class,
          level: character.level,
          trophies: character.trophies
        } : null
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Update current user profile
router.patch('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { username, bio, avatarUrl } = validation.data;
    const userId = req.user!.id;

    // Check if username is taken (if being changed)
    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: userId }
      });

      if (existingUser) {
        res.status(409).json({ error: 'Username already in use' });
        return;
      }
    }

    const updateData: Record<string, any> = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Search users
router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, limit = '20' } = req.query;

    let query = {};
    if (q && typeof q === 'string') {
      query = {
        $or: [
          { username: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('username avatarUrl createdAt')
      .limit(parseInt(limit as string, 10))
      .sort({ createdAt: -1 });

    res.json({ data: users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

export default router;
