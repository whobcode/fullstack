import { z } from 'zod';

export const facebookAuthSchema = z.object({
  accessToken: z.string().min(10),
});
