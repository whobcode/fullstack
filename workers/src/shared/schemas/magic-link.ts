import { z } from 'zod';

export const magicLinkRequestSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
});

export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkVerifyInput = z.infer<typeof magicLinkVerifySchema>;
