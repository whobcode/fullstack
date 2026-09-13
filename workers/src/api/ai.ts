import { Hono } from 'hono';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';

const ai = new Hono<{ Bindings: Bindings }>();

/**
 * Avatar prompts per character class.
 *
 * The creature follows the class line: both phoenix classes get a phoenix,
 * both dragon classes a dragon, and kies a humanoid spirit. The dark variants
 * share their line's creature and differ in tone rather than in subject.
 *
 * All of them keep the .shade look — black ground, red neon rim light, high
 * contrast, readable at avatar size.
 */
const SHADE_LOOK = 'pure black background, red neon rim lighting, high contrast, cinematic, minimalist avatar icon, centered portrait';

const CLASS_PROMPTS: Record<string, string> = {
  phoenix:  `majestic phoenix with burning crimson plumage, wings spread, embers rising, ${SHADE_LOOK}`,
  dphoenix: `dark phoenix wreathed in black fire, charred crimson feathers, ash and embers, menacing silhouette, ${SHADE_LOOK}`,
  dragon:   `armored dragon head in profile, scaled hide, glowing red eyes, coiled and watchful, ${SHADE_LOOK}`,
  ddragon:  `dark dragon shrouded in shadow, obsidian scales, smouldering red eyes, malevolent presence, ${SHADE_LOOK}`,
  // Kies has two readings and no settled answer, so it gets both: each
  // generation picks one at even odds, which also gives kies players more
  // variety than the single-prompt classes.
  kies:     `humanoid spirit figure, translucent flowing form, faintly glowing outline, serene and otherworldly, ${SHADE_LOOK}`,
};

/** The other half of the kies coin flip. */
const KIES_SHADY = `shady spirit, wraith-like humanoid shrouded in drifting shadow, half-dissolved form, faint red glow beneath the hood of darkness, ${SHADE_LOOK}`;

/** Prompt for a class, falling back to the generic shade look. */
function promptForClass(cls?: string | null): string {
  if (cls === 'kies') {
    return Math.random() < 0.5 ? CLASS_PROMPTS.kies : KIES_SHADY;
  }
  if (cls && CLASS_PROMPTS[cls]) return CLASS_PROMPTS[cls];
  return shadePrompts[Math.floor(Math.random() * shadePrompts.length)];
}

// Generic shade variations, used when the class is unknown.
const shadePrompts = [
  'dark hooded figure silhouette, neon red glow outline, cyberpunk style, pure black background, mysterious shadow, red neon rim lighting, high contrast, minimalist avatar',
  'shadowy face portrait, glowing red eyes, dark cyberpunk aesthetic, black void background, neon red highlights, ominous figure, avatar icon',
  'abstract dark silhouette, crimson neon aura, noir style, black background, mysterious presence, red glow effects, minimalist portrait',
  'masked shadow warrior, red neon accents, dark cyberpunk, black background, glowing red edges, mysterious avatar',
  'phantom silhouette portrait, blood red neon outline, dark aesthetic, pure black background, ghostly figure, high contrast avatar',
];

// R2 public URL base (custom domain, same as the upload routes).
const SHADE_IMAGE_BASE = 'https://shade-image.hwmnbn.me';

// Collect a ReadableStream into a single Uint8Array.
async function streamToBytes(stream: ReadableStream): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return combined;
}

// Base64-encode bytes in chunks (avoids blowing the call stack on large images).
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Persist a generated avatar to R2 and save its URL.
 *
 * The avatar belongs to a character, not the account: a player with several
 * characters used to share one, so generating a new one silently replaced the
 * previous character's. `characterId` is the character being played as; the
 * account-level column is kept in step as the fallback for characters that
 * have not generated one yet.
 *
 * Returns the public URL, or undefined if persistence failed (generation still
 * succeeds and the caller can show the inline preview).
 */
async function persistShadeAvatar(
  env: Bindings,
  userId: string,
  bytes: Uint8Array,
  characterId?: string | null,
): Promise<string | undefined> {
  try {
    const key = `shade-avatars/${userId}/${Date.now()}.png`;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: 'image/png' } });
    const url = `${SHADE_IMAGE_BASE}/${key}`;

    const writes = [
      env.DB.prepare('UPDATE users SET shade_avatar_url = ? WHERE id = ?').bind(url, userId),
    ];
    if (characterId) {
      writes.push(
        env.DB.prepare('UPDATE characters SET shade_avatar_url = ? WHERE id = ? AND user_id = ?')
          .bind(url, characterId, userId),
      );
    }
    await env.DB.batch(writes);
    return url;
  } catch (err: any) {
    console.warn('Failed to persist shade avatar:', err?.message || err);
    return undefined;
  }
}

/**
 * The character an avatar request is for: ?character_id=, else the active one.
 * Returns the class too, so the prompt can match the character's line.
 */
async function avatarCharacter(env: Bindings, c: any, userId: string): Promise<{ id: string; class: string | null } | null> {
  const requested = c.req.query('character_id');
  if (requested) {
    const owned = await env.DB
      .prepare('SELECT id, class FROM characters WHERE id = ? AND user_id = ?')
      .bind(requested, userId)
      .first<{ id: string; class: string | null }>();
    if (owned) return owned;
  }
  return env.DB
    .prepare(`
      SELECT c.id, c.class FROM characters c
      JOIN users u ON u.active_character_id = c.id
      WHERE u.id = ?
    `)
    .bind(userId)
    .first<{ id: string; class: string | null }>();
}

// Generate a shade-themed avatar (text-to-image), persist it, and return both
// an inline data URL (instant preview) and the saved public URL.
ai.post('/shade-avatar', authMiddleware, async (c) => {
  try {
    const userId = (c.get('user') as { id: string } | undefined)?.id;

    // Pick a random shade prompt variation
    const target = userId ? await avatarCharacter(c.env, c, userId) : null;
    const randomPrompt = promptForClass(target?.class);

    const result = await c.env.AI.run(
      '@cf/bytedance/stable-diffusion-xl-lightning',
      {
        prompt: randomPrompt,
        num_steps: 8,
      }
    );

    if (result instanceof ReadableStream) {
      const bytes = await streamToBytes(result);
      const url = userId
        ? await persistShadeAvatar(c.env, userId, bytes, target?.id ?? null)
        : undefined;
      return c.json({
        image: `data:image/png;base64,${bytesToBase64(bytes)}`,
        url,
        success: true
      });
    }

    return c.json({ error: 'Unexpected AI response format' }, 500);
  } catch (err: any) {
    console.error('Shade avatar generation failed:', err?.message || err);
    return c.json({ error: err?.message || 'Failed to generate shade avatar' }, 500);
  }
});

// Generate shade avatar with optional custom prompt additions
ai.post('/generate-shade-avatar', authMiddleware, async (c) => {
  try {
    const userId = (c.get('user') as { id: string } | undefined)?.id;
    const body: { prompt?: string; style?: string } = await c.req.json().catch(() => ({}));
    const customAddition = body.prompt || '';
    const style = body.style || 'random';

    // Default to the character's own class creature; 'style' can override it.
    const target = userId ? await avatarCharacter(c.env, c, userId) : null;

    let basePrompt: string;

    if (style === 'random') {
      basePrompt = promptForClass(target?.class);
    } else {
      basePrompt = 'dark silhouette portrait, neon red glow outline, cyberpunk style, black background, mysterious shadow figure, red neon lighting, high contrast, minimalist, avatar icon';
    }

    const fullPrompt = customAddition ? `${basePrompt}, ${customAddition}` : basePrompt;

    const result = await c.env.AI.run(
      '@cf/bytedance/stable-diffusion-xl-lightning',
      {
        prompt: fullPrompt,
        num_steps: 8,
      }
    );

    if (result instanceof ReadableStream) {
      const bytes = await streamToBytes(result);
      const url = userId
        ? await persistShadeAvatar(c.env, userId, bytes, target?.id ?? null)
        : undefined;
      return c.json({
        image: `data:image/png;base64,${bytesToBase64(bytes)}`,
        url,
        success: true
      });
    }

    return c.json({ error: 'Unexpected AI response format' }, 500);
  } catch (err: any) {
    console.error('Shade avatar generation failed:', err?.message || err);
    return c.json({ error: err?.message || 'Failed to generate shade avatar' }, 500);
  }
});

export default ai;
