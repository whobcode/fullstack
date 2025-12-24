import { z } from 'zod';

export const googleAuthSchema = z.object({
  credential: z.string().min(10), // Google ID token (JWT)
});
