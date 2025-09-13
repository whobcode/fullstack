import { z } from 'zod';

export const friendRequestSchema = z.object({
  addresseeId: z.string().uuid({ message: 'Invalid user ID' }),
});

export const respondToRequestSchema = z.object({
  requesterId: z.string().uuid({ message: 'Invalid user ID' }),
  status: z.enum(['accepted', 'blocked']), // 'blocked' can be used for decline/block
});

export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
export type RespondToRequestInput = z.infer<typeof respondToRequestSchema>;
