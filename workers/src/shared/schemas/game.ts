import { z } from 'zod';

export const firstAccessSchema = z.object({
  gamertag: z
    .string()
    .min(3, { message: 'Gamertag must be at least 3 characters long' })
    .max(20, { message: 'Gamertag must be no more than 20 characters long' })
    .regex(/^[a-zA-Z0-9_.-]+$/, {
      message: 'Gamertag can only contain letters, numbers, underscores, dots, and hyphens',
    }),
  class: z.enum(['phoenix', 'dphoenix', 'dragon', 'ddragon', 'kies'], {
    message: 'Invalid class selected',
  }),
});

export const allocatePointsSchema = z.object({
    hp: z.number().int().min(0).default(0),
    atk: z.number().int().min(0).default(0),
    def: z.number().int().min(0).default(0),
    mp: z.number().int().min(0).default(0),
    spd: z.number().int().min(0).default(0),
});


export type FirstAccessInput = z.infer<typeof firstAccessSchema>;

export const customizeCharacterSchema = z
  .object({
    gamertag: z
      .string()
      .min(3, { message: 'Gamertag must be at least 3 characters long' })
      .max(20, { message: 'Gamertag must be no more than 20 characters long' })
      .regex(/^[a-zA-Z0-9_.-]+$/, { message: 'Gamertag can only contain letters, numbers, underscores, dots, and hyphens' })
      .optional(),
    class: z.enum(['phoenix', 'dphoenix', 'dragon', 'ddragon', 'kies']).optional(),
  })
  .refine((d) => d.gamertag || d.class, { message: 'Provide a gamertag and/or a class to change' });

export type CustomizeCharacterInput = z.infer<typeof customizeCharacterSchema>;

export type AllocatePointsInput = z.infer<typeof allocatePointsSchema>;

export const createBattleSchema = z.object({
    defenderId: z.string().uuid({ message: 'Invalid character ID' }),
    mode: z.enum(['async', 'realtime']),
});

export const submitTurnSchema = z.object({
    action: z.enum(['attack']), // For now, only attack is supported
});

export type CreateBattleInput = z.infer<typeof createBattleSchema>;
export type SubmitTurnInput = z.infer<typeof submitTurnSchema>;

