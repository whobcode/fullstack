import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const createPostSchema = z.object({
  body: z.string().min(1).max(2000)
});

// Get feed (all posts, paginated)
router.get('/feed', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { limit = '20', cursor } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10), 50);

    let query: any = {};
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor as string) };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate('authorId', 'username avatarUrl');

    const formattedPosts = posts.map(post => ({
      id: post._id,
      body: post.body,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        id: (post.authorId as any)._id,
        username: (post.authorId as any).username,
        avatarUrl: (post.authorId as any).avatarUrl
      }
    }));

    const nextCursor = posts.length === limitNum
      ? posts[posts.length - 1].createdAt.toISOString()
      : null;

    res.json({
      data: formattedPosts,
      nextCursor
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Create a post
router.post('/posts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = createPostSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { body } = validation.data;

    const post = await Post.create({
      authorId: req.user!.id,
      body
    });

    const user = await User.findById(req.user!.id);

    res.status(201).json({
      data: {
        id: post._id,
        body: post.body,
        createdAt: post.createdAt,
        author: {
          id: req.user!.id,
          username: user?.username,
          avatarUrl: user?.avatarUrl
        }
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Get a single post
router.get('/posts/:id', async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('authorId', 'username avatarUrl');

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json({
      data: {
        id: post._id,
        body: post.body,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: {
          id: (post.authorId as any)._id,
          username: (post.authorId as any).username,
          avatarUrl: (post.authorId as any).avatarUrl
        }
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Update a post
router.patch('/posts/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = createPostSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const post = await Post.findOne({
      _id: req.params.id,
      authorId: req.user!.id
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found or not authorized' });
      return;
    }

    post.body = validation.data.body;
    await post.save();

    res.json({
      data: {
        id: post._id,
        body: post.body,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Delete a post
router.delete('/posts/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await Post.deleteOne({
      _id: req.params.id,
      authorId: req.user!.id
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Post not found or not authorized' });
      return;
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Get user's posts
router.get('/users/:userId/posts', async (req: Request, res: Response) => {
  try {
    const { limit = '20', cursor } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10), 50);

    let query: any = { authorId: req.params.userId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor as string) };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate('authorId', 'username avatarUrl');

    const formattedPosts = posts.map(post => ({
      id: post._id,
      body: post.body,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        id: (post.authorId as any)._id,
        username: (post.authorId as any).username,
        avatarUrl: (post.authorId as any).avatarUrl
      }
    }));

    const nextCursor = posts.length === limitNum
      ? posts[posts.length - 1].createdAt.toISOString()
      : null;

    res.json({
      data: formattedPosts,
      nextCursor
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

export default router;
