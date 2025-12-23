import { z } from 'zod';

// Chat message schema
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Text chat request (for /voice/chat)
export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(chatMessageSchema).optional().default([]),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Text-to-speech request (for /voice/synthesize)
export const synthesizeRequestSchema = z.object({
  text: z.string().min(1).max(1000),
  voice: z.string().optional(), // Wit.ai voice ID
  speed: z.number().min(0.5).max(2).optional(),
  pitch: z.number().min(0.5).max(2).optional(),
});

export type SynthesizeRequest = z.infer<typeof synthesizeRequestSchema>;

// Combined conversation request (audio in, audio + text out)
export const conversationRequestSchema = z.object({
  history: z.array(chatMessageSchema).optional().default([]),
});

export type ConversationRequest = z.infer<typeof conversationRequestSchema>;
