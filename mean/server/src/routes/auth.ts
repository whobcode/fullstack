import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Character } from '../models/Character.js';
import { hashPassword, verifyPassword, generateSessionToken, hashToken } from '../lib/auth.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Helper to create session
async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await Session.create({
    userId,
    tokenHash,
    expiresAt
  });

  return token;
}

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { email, username, password } = validation.data;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      res.status(409).json({ error: 'Email or username already in use' });
      return;
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email,
      username,
      passwordHash
    });

    // Create default character
    await Character.create({
      userId: user._id,
      slotIndex: 0,
      firstGameAccessCompleted: false
    });

    // Create session
    const sessionToken = await createSession(user._id.toString());

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { email, password } = validation.data;

    // Find user with character
    const user = await User.findOne({ email });

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Get character
    const character = await Character.findOne({ userId: user._id, slotIndex: 0 });

    // Create session
    const sessionToken = await createSession(user._id.toString());

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        characterId: character?._id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies?.session_token;

    if (sessionToken) {
      const tokenHash = hashToken(sessionToken);
      await Session.deleteOne({ tokenHash });
    }

    res.clearCookie('session_token');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const character = await Character.findOne({ userId: user._id, slotIndex: 0 });

    res.json({
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        characterId: character?._id
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

export default router;
