import { z } from 'zod';

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Used from account settings by a logged-in user to create or change their
// password. currentPassword is required only when the account already has one
// (accounts created via Google / magic link have no password to verify).
export const passwordChangeSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
