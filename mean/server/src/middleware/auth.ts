import { Request, Response, NextFunction } from 'express';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { hashToken } from '../lib/auth.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
      sessionId?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const tokenHash = hashToken(sessionToken);

    const session = await Session.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const user = await User.findById(session.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username
    };
    req.sessionId = session._id.toString();

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Optional auth middleware - doesn't fail if no session
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      next();
      return;
    }

    const tokenHash = hashToken(sessionToken);

    const session = await Session.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() }
    });

    if (session) {
      const user = await User.findById(session.userId);
      if (user) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          username: user.username
        };
        req.sessionId = session._id.toString();
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth
    next();
  }
}
