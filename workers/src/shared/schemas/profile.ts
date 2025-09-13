import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(20, { message: 'Username must be no more than 20 characters long' })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: 'Username can only contain letters, numbers, and underscores',
    })
    .optional(),
  bio: z
    .string()
    .max(160, { message: 'Bio must be no more than 160 characters long' })
    .optional(),
  avatar_url: z
    .string()
    .url({ message: 'Invalid URL format' })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
