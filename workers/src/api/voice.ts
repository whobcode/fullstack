import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';
import {
  chatRequestSchema,
  synthesizeRequestSchema,
  conversationRequestSchema,
  voiceHistorySchema,
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

// System prompt for the voice assistant — an in-game expert coach for the
// .shade RPG that teaches strategy, builds, and point placement.
function buildSystemPrompt(username?: string): string {
  const base = `You are the .shade game guide — a friendly, expert coach for the .shade RPG. You teach players how the game works, recommend builds, and advise on stat-point placement. Keep responses concise and conversational (they are spoken aloud): no markdown or code blocks.

GAME KNOWLEDGE (authoritative — use this, don't invent mechanics):

Classes and base stats (HP / ATK / DEF / SPD):
- Phoenix: 10000 / 1000 / 500 / 100 — balanced, attack-leaning.
- Dark Phoenix (dphoenix): 10000 / 1750 / 375 / 150 — highest base attack, glass cannon.
- Dragon: 10000 / 750 / 1100 / 175 — tanky; dragons also gain bonus attack power from their DEF + SPD.
- Dark Dragon (ddragon): 10000 / 1000 / 1000 / 75 — balanced bruiser (also gets the dragon DEF+SPD attack bonus).
- Kies: 15000 / 750 / 750 / 225 — highest base HP and speed.

Stat-point allocation (one point each, from the unspent pool you earn by leveling — about 5 per level, plus 5 extra every 5th level):
- HP: +100 max health per point. Health is your battle pool.
- SPD: +2 speed per point. Speed is powerful (see battles).
- ATK: +1% of your class's BASE attack per point. So 100 ATK points = +100% = double your base attack. Higher-base-attack classes get more per point.
- DEF: +1% of your class's BASE defense per point.
- MP is unused — don't spend points there.
- Tip: because ATK/DEF scale off BASE, the class you start with strongly shapes which stats are efficient.

Battle mechanics:
- Speed decides initiative: the faster fighter strikes FIRST, and lands multiple hits before the slower one can respond — roughly (faster speed / slower speed) hits, capped at 5. The slower fighter gets a single counterattack only if still alive. So a big speed advantage can let you hit 2-5 times and even kill before they swing.
- Damage uses mitigation: defense reduces damage but never to zero, so every landed hit chips health. Roughly attack^2 / (attack + defense).
- Dragons (dragon, ddragon) add their DEF and SPD to their attack power — a tanky dragon still hits hard.
- Killing: bringing a target to 0 HP earns the attacker a kill and win; the loser gets a death and loss and stays defeated (unattackable) until healed.
- Defense character: you can pick a "defending character" on the dashboard; when someone attacks you, that character answers. Your "active/playing-as" character is who acts when you attack or build.

Recovery: health and stamina regenerate over time (health ~2% of max per minute; stamina 1 per 3 minutes). The Hospital (on the dashboard) heals to full instantly for currency (10 per HP). Attacks cost 1 stamina.

Other systems: a leaderboard (by level, wins, kills); a Hitlist where players post bounties to have others killed; clans (members multiply equipment power in battle); an Ability Shop (equipment that adds ATK/DEF — buy what your level allows). You also fight bot opponents across levels 1-275.

Build strategy you can recommend:
- Speed build: pump SPD to strike first and multi-hit — great for bursting down slower targets before they retaliate. Pair with enough ATK to make hits hurt.
- Glass cannon: Dark Phoenix + heavy ATK; fast kills but fragile.
- Tank/bruiser: Dragon with DEF + SPD (DEF feeds attack for dragons) + HP to survive and grind.
- Always keep some HP so a single fast attacker can't one-shot you.

Be specific and practical. If asked "where should I put points," ask about their class and goal, then give a concrete split.`;
  return username ? `${base}\n\nYou are speaking with ${username}; address them by name when natural.` : base;
}

// Per-user KV key for the saved voice conversation.
const voiceHistoryKey = (userId: string) => `voice:history:${userId}`;
// Keep stored history bounded.
const MAX_STORED_MESSAGES = 50;

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// Wit.ai TTS requires a voice; this is the name as returned by GET /voice/voices.
const DEFAULT_VOICE = 'wit$Rebecca';
// Wit.ai /synthesize caps the input length; keep spoken text within a safe bound.
const WIT_TTS_MAX_CHARS = 280;

function clampForTts(text: string): string {
  if (text.length <= WIT_TTS_MAX_CHARS) return text;
  const slice = text.slice(0, WIT_TTS_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim();
}

// Call Wit.ai text-to-speech correctly: the text (`q`) and a REQUIRED `voice`
// go in a JSON body, not the query string. Returns WAV audio bytes or throws
// with the upstream detail.
async function witSynthesize(
  token: string,
  text: string,
  opts: { voice?: string; style?: string; speed?: number; pitch?: number } = {},
): Promise<ArrayBuffer> {
  const body: Record<string, unknown> = {
    q: clampForTts(text),
    voice: opts.voice || DEFAULT_VOICE,
  };
  if (opts.style) body.style = opts.style;
  // Our API takes 0.5–2.0 multipliers; Wit expects integer percentages (100 = normal).
  if (typeof opts.speed === 'number') body.speed = Math.round(opts.speed * 100);
  if (typeof opts.pitch === 'number') body.pitch = Math.round(opts.pitch * 100);

  const res = await fetch(`https://api.wit.ai/synthesize?v=${WIT_API_VERSION}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'audio/wav',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Wit.ai TTS ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.arrayBuffer();
}

// Speech-to-text via Workers AI Whisper. Unlike Wit.ai's /speech endpoint, this
// handles the browser's MediaRecorder output (webm/opus on Chrome/Firefox,
// mp4/aac on Safari) directly, so the mic actually works.
async function transcribeAudio(ai: Ai, audio: ArrayBuffer): Promise<string> {
  const base64 = arrayBufferToBase64(audio);
  const result = (await ai.run(
    '@cf/openai/whisper-large-v3-turbo' as keyof AiModels,
    { audio: base64 } as any,
  )) as { text?: string };
  return (result?.text || '').trim();
}

// POST /voice/transcribe - Speech-to-text via Workers AI Whisper
voice.post('/transcribe', authMiddleware, async (c) => {
  try {
    // Get raw audio data from request body
    const audioData = await c.req.arrayBuffer();
    if (!audioData || audioData.byteLength === 0) {
      return c.json({ error: 'No audio data provided' }, 400);
    }

    const text = await transcribeAudio(c.env.AI, audioData);

    return c.json({
      text,
      intents: [],
      entities: {},
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
      const user = c.get('user');

      // Build messages array with system prompt
      const messages: ChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(user?.username) },
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

      const audioBuffer = await witSynthesize(witToken, text, { voice: voiceId, speed, pitch });
      const base64Audio = arrayBufferToBase64(audioBuffer);

      return c.json({
        audio: `data:audio/wav;base64,${base64Audio}`,
        contentType: 'audio/wav',
      });
    } catch (err: any) {
      console.error('Synthesize error:', err?.message || err);
      return c.json({ error: 'Speech synthesis failed', detail: err?.message }, 502);
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

    // Step 1: Transcribe audio via Workers AI Whisper (handles browser audio).
    const audioData = await audioFile.arrayBuffer();
    const userText = await transcribeAudio(c.env.AI, audioData);

    if (!userText.trim()) {
      return c.json({ error: 'Could not understand audio' }, 400);
    }

    // Step 2: Generate AI response via Workers AI
    const messages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(c.get('user')?.username) },
      ...history,
      { role: 'user', content: userText },
    ];

    const aiResult = await c.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as keyof AiModels,
      { messages }
    ) as AiChatResponse;

    const responseText = aiResult.response || '';

    // Step 3: Synthesize response via Wit.ai TTS. If it fails, still return the
    // text response so the conversation isn't lost.
    let audio: string | null = null;
    try {
      const audioBuffer = await witSynthesize(witToken, responseText);
      audio = `data:audio/wav;base64,${arrayBufferToBase64(audioBuffer)}`;
    } catch (ttsErr: any) {
      console.error('Wit.ai TTS error, returning text only:', ttsErr?.message || ttsErr);
    }

    return c.json({
      userText,
      responseText,
      audio,
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

// GET /voice/history - Load the user's saved voice conversation (from KV)
voice.get('/history', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const raw = await c.env.APP_CONFIG.get(voiceHistoryKey(user.id));
    const messages = raw ? JSON.parse(raw) : [];
    return c.json({ messages });
  } catch (err: any) {
    console.error('Load voice history error:', err?.message || err);
    return c.json({ messages: [] });
  }
});

// PUT /voice/history - Save the user's voice conversation (to KV)
voice.put('/history', authMiddleware, zValidator('json', voiceHistorySchema), async (c) => {
  try {
    const user = c.get('user');
    const { messages } = c.req.valid('json');
    // Only keep the most recent messages so the KV value stays small.
    const trimmed = messages.slice(-MAX_STORED_MESSAGES);
    await c.env.APP_CONFIG.put(voiceHistoryKey(user.id), JSON.stringify(trimmed));
    return c.json({ ok: true, count: trimmed.length });
  } catch (err: any) {
    console.error('Save voice history error:', err?.message || err);
    return c.json({ error: 'Failed to save conversation' }, 500);
  }
});

// DELETE /voice/history - Clear the user's saved voice conversation
voice.delete('/history', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    await c.env.APP_CONFIG.delete(voiceHistoryKey(user.id));
    return c.json({ ok: true });
  } catch (err: any) {
    console.error('Clear voice history error:', err?.message || err);
    return c.json({ error: 'Failed to clear conversation' }, 500);
  }
});

export default voice;
