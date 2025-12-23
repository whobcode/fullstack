import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import {
  chatRequestSchema,
  synthesizeRequestSchema,
  conversationRequestSchema,
  type ChatMessage,
} from '../shared/schemas/voice';

type App = {
  Bindings: Bindings;
  Variables: {
    user: { id: string; email: string; username: string };
  };
};

// Wit.ai response types
interface WitSpeechResponse {
  text?: string;
  intents?: Array<{ id: string; name: string; confidence: number }>;
  entities?: Record<string, unknown>;
}

// Workers AI response type
interface AiChatResponse {
  response: string;
}

const voice = new Hono<App>();

// Wit.ai API version
const WIT_API_VERSION = '20230215';

// System prompt for the voice assistant
const VOICE_SYSTEM_PROMPT = `You are a helpful and friendly voice assistant. Keep your responses concise and conversational since they will be spoken aloud. Avoid using markdown, code blocks, or formatting that doesn't work well in speech. Respond naturally as if having a spoken conversation.`;

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// POST /voice/transcribe - Speech-to-text via Wit.ai
voice.post('/transcribe', authMiddleware, async (c) => {
  try {
    const witToken = c.env.WIT_AI_TOKEN;
    if (!witToken) {
      return c.json({ error: 'Wit.ai not configured' }, 500);
    }

    // Get raw audio data from request body
    const audioData = await c.req.arrayBuffer();
    if (!audioData || audioData.byteLength === 0) {
      return c.json({ error: 'No audio data provided' }, 400);
    }

    // Get content type from request (default to audio/wav)
    const contentType = c.req.header('Content-Type') || 'audio/wav';

    // Call Wit.ai Speech API
    const witResponse = await fetch(
      `https://api.wit.ai/speech?v=${WIT_API_VERSION}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${witToken}`,
          'Content-Type': contentType,
        },
        body: audioData,
      }
    );

    if (!witResponse.ok) {
      const errorText = await witResponse.text();
      console.error('Wit.ai STT error:', errorText);
      return c.json({ error: 'Speech recognition failed' }, 500);
    }

    const result = await witResponse.json() as WitSpeechResponse;

    return c.json({
      text: result.text || '',
      intents: result.intents || [],
      entities: result.entities || {},
    });
  } catch (err: any) {
    console.error('Transcribe error:', err?.message || err);
    return c.json({ error: 'Failed to transcribe audio' }, 500);
  }
});

// POST /voice/chat - Text chat via Workers AI
voice.post(
  '/chat',
  authMiddleware,
  zValidator('json', chatRequestSchema),
  async (c) => {
    try {
      const { message, history } = c.req.valid('json');

      // Build messages array with system prompt
      const messages: ChatMessage[] = [
        { role: 'system', content: VOICE_SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: message },
      ];

      // Call Workers AI
      const result = await c.env.AI.run(
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as keyof AiModels,
        { messages }
      ) as AiChatResponse;

      const responseText = result.response || '';

      return c.json({
        response: responseText,
        message: {
          role: 'assistant' as const,
          content: responseText,
        },
      });
    } catch (err: any) {
      console.error('Chat error:', err?.message || err);
      return c.json({ error: 'Failed to generate response' }, 500);
    }
  }
);

// POST /voice/synthesize - Text-to-speech via Wit.ai
voice.post(
  '/synthesize',
  authMiddleware,
  zValidator('json', synthesizeRequestSchema),
  async (c) => {
    try {
      const witToken = c.env.WIT_AI_TOKEN;
      if (!witToken) {
        return c.json({ error: 'Wit.ai not configured' }, 500);
      }

      const { text, voice: voiceId, speed, pitch } = c.req.valid('json');

      // Build query params
      const params = new URLSearchParams({
        v: WIT_API_VERSION,
        q: text,
      });
      if (voiceId) params.set('voice', voiceId);
      if (speed) params.set('speed', speed.toString());
      if (pitch) params.set('pitch', pitch.toString());

      // Call Wit.ai Synthesize API
      const witResponse = await fetch(
        `https://api.wit.ai/synthesize?${params.toString()}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${witToken}`,
            Accept: 'audio/wav',
          },
        }
      );

      if (!witResponse.ok) {
        const errorText = await witResponse.text();
        console.error('Wit.ai TTS error:', errorText);
        return c.json({ error: 'Speech synthesis failed' }, 500);
      }

      // Return audio as base64
      const audioBuffer = await witResponse.arrayBuffer();
      const base64Audio = arrayBufferToBase64(audioBuffer);

      return c.json({
        audio: `data:audio/wav;base64,${base64Audio}`,
        contentType: 'audio/wav',
      });
    } catch (err: any) {
      console.error('Synthesize error:', err?.message || err);
      return c.json({ error: 'Failed to synthesize speech' }, 500);
    }
  }
);

// POST /voice/conversation - Combined: audio in -> AI response -> audio out
voice.post('/conversation', authMiddleware, async (c) => {
  try {
    const witToken = c.env.WIT_AI_TOKEN;
    if (!witToken) {
      return c.json({ error: 'Wit.ai not configured' }, 500);
    }

    // Parse multipart form data
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    const historyJson = formData.get('history') as string | null;

    if (!audioFile) {
      return c.json({ error: 'No audio file provided' }, 400);
    }

    // Parse history if provided
    let history: ChatMessage[] = [];
    if (historyJson) {
      try {
        const parsed = JSON.parse(historyJson);
        history = conversationRequestSchema.parse({ history: parsed.history || parsed }).history;
      } catch {
        // Ignore parse errors, use empty history
      }
    }

    // Step 1: Transcribe audio via Wit.ai
    const audioData = await audioFile.arrayBuffer();
    const sttResponse = await fetch(
      `https://api.wit.ai/speech?v=${WIT_API_VERSION}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${witToken}`,
          'Content-Type': audioFile.type || 'audio/wav',
        },
        body: audioData,
      }
    );

    if (!sttResponse.ok) {
      const errorText = await sttResponse.text();
      console.error('Wit.ai STT error:', errorText);
      return c.json({ error: 'Speech recognition failed' }, 500);
    }

    const sttResult = await sttResponse.json() as WitSpeechResponse;
    const userText = sttResult.text || '';

    if (!userText.trim()) {
      return c.json({ error: 'Could not understand audio' }, 400);
    }

    // Step 2: Generate AI response via Workers AI
    const messages: ChatMessage[] = [
      { role: 'system', content: VOICE_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userText },
    ];

    const aiResult = await c.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as keyof AiModels,
      { messages }
    ) as AiChatResponse;

    const responseText = aiResult.response || '';

    // Step 3: Synthesize response via Wit.ai TTS
    const ttsParams = new URLSearchParams({
      v: WIT_API_VERSION,
      q: responseText,
    });

    const ttsResponse = await fetch(
      `https://api.wit.ai/synthesize?${ttsParams.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${witToken}`,
          Accept: 'audio/wav',
        },
      }
    );

    if (!ttsResponse.ok) {
      // If TTS fails, still return text response
      console.error('Wit.ai TTS error, returning text only');
      return c.json({
        userText,
        responseText,
        audio: null,
        messages: [
          { role: 'user', content: userText },
          { role: 'assistant', content: responseText },
        ],
      });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const base64Audio = arrayBufferToBase64(audioBuffer);

    return c.json({
      userText,
      responseText,
      audio: `data:audio/wav;base64,${base64Audio}`,
      messages: [
        { role: 'user', content: userText },
        { role: 'assistant', content: responseText },
      ],
    });
  } catch (err: any) {
    console.error('Conversation error:', err?.message || err);
    return c.json({ error: 'Conversation processing failed' }, 500);
  }
});

// GET /voice/voices - Get available Wit.ai voices
voice.get('/voices', authMiddleware, async (c) => {
  try {
    const witToken = c.env.WIT_AI_TOKEN;
    if (!witToken) {
      return c.json({ error: 'Wit.ai not configured' }, 500);
    }

    const response = await fetch(
      `https://api.wit.ai/voices?v=${WIT_API_VERSION}`,
      {
        headers: {
          Authorization: `Bearer ${witToken}`,
        },
      }
    );

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch voices' }, 500);
    }

    const voices = await response.json();
    return c.json({ voices });
  } catch (err: any) {
    console.error('Voices error:', err?.message || err);
    return c.json({ error: 'Failed to fetch voices' }, 500);
  }
});

export default voice;
