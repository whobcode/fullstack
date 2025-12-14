import { Hono } from 'hono';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';

const ai = new Hono<{ Bindings: Bindings }>();

// Array of shade-themed avatar variations
const shadePrompts = [
  'dark hooded figure silhouette, neon red glow outline, cyberpunk style, pure black background, mysterious shadow, red neon rim lighting, high contrast, minimalist avatar',
  'shadowy face portrait, glowing red eyes, dark cyberpunk aesthetic, black void background, neon red highlights, ominous figure, avatar icon',
  'abstract dark silhouette, crimson neon aura, noir style, black background, mysterious presence, red glow effects, minimalist portrait',
  'masked shadow warrior, red neon accents, dark cyberpunk, black background, glowing red edges, mysterious avatar',
  'phantom silhouette portrait, blood red neon outline, dark aesthetic, pure black background, ghostly figure, high contrast avatar',
];

// Helper to convert stream to base64
async function streamToBase64(stream: ReadableStream): Promise<string> {
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

  return btoa(String.fromCharCode(...combined));
}

// Generate a shade-themed avatar (text-to-image)
ai.post('/shade-avatar', authMiddleware, async (c) => {
  try {
    // Pick a random shade prompt variation
    const randomPrompt = shadePrompts[Math.floor(Math.random() * shadePrompts.length)];

    const result = await c.env.AI.run(
      '@cf/bytedance/stable-diffusion-xl-lightning',
      {
        prompt: randomPrompt,
        num_steps: 8,
      }
    );

    if (result instanceof ReadableStream) {
      const base64 = await streamToBase64(result);
      return c.json({
        image: `data:image/png;base64,${base64}`,
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
    const body: { prompt?: string; style?: string } = await c.req.json().catch(() => ({}));
    const customAddition = body.prompt || '';
    const style = body.style || 'random';

    let basePrompt: string;

    if (style === 'random') {
      basePrompt = shadePrompts[Math.floor(Math.random() * shadePrompts.length)];
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
      const base64 = await streamToBase64(result);
      return c.json({
        image: `data:image/png;base64,${base64}`,
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
