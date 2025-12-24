import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(800),
});

export const reactSchema = z.object({
  type: z.enum(['like', 'hype', 'gg']),
});

export const createGroupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});
