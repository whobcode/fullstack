import { Hono } from 'hono';
import type { Bindings } from '../bindings';
import { authMiddleware } from './middleware/auth';

type App = {
  Bindings: Bindings;
  Variables: {
    user: { id: string; email: string; username: string };
  };
};

const upload = new Hono<App>();

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Size limits in bytes
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB

// R2 public URL base (custom domain)
const getPublicUrl = (key: string) => {
  return `https://shade-image.hwmnbn.me/${key}`;
};

// Get file extension from MIME type
function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return extensions[mimeType] || 'jpg';
}

// POST /upload/avatar - Upload profile picture
upload.post('/avatar', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF'
      }, 400);
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      return c.json({
        error: 'File too large. Maximum size: 5MB'
      }, 400);
    }

    // Generate unique key
    const ext = getExtension(file.type);
    const key = `avatars/${user.id}/${Date.now()}.${ext}`;

    // Upload to R2
    await c.env.MEDIA.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Get public URL
    const url = getPublicUrl(key);

    // Update user record in database
    await c.env.DB
      .prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(url, user.id)
      .run();

    return c.json({
      success: true,
      url,
      message: 'Avatar uploaded successfully'
    });
  } catch (err: any) {
    console.error('Avatar upload error:', err?.message || err);
    return c.json({ error: 'Failed to upload avatar' }, 500);
  }
});

// POST /upload/cover - Upload cover photo
upload.post('/cover', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF'
      }, 400);
    }

    // Validate file size
    if (file.size > MAX_COVER_SIZE) {
      return c.json({
        error: 'File too large. Maximum size: 10MB'
      }, 400);
    }

    // Generate unique key
    const ext = getExtension(file.type);
    const key = `covers/${user.id}/${Date.now()}.${ext}`;

    // Upload to R2
    await c.env.MEDIA.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Get public URL
    const url = getPublicUrl(key);

    // Update user record in database
    await c.env.DB
      .prepare('UPDATE users SET cover_photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(url, user.id)
      .run();

    return c.json({
      success: true,
      url,
      message: 'Cover photo uploaded successfully'
    });
  } catch (err: any) {
    console.error('Cover upload error:', err?.message || err);
    return c.json({ error: 'Failed to upload cover photo' }, 500);
  }
});

// DELETE /upload/avatar - Remove profile picture
upload.delete('/avatar', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    // Get current avatar URL to extract key
    const result = await c.env.DB
      .prepare('SELECT avatar_url FROM users WHERE id = ?')
      .bind(user.id)
      .first<{ avatar_url: string | null }>();

    if (result?.avatar_url) {
      // Extract key from URL and delete from R2
      const url = new URL(result.avatar_url);
      const key = url.pathname.slice(1); // Remove leading slash
      await c.env.MEDIA.delete(key);
    }

    // Clear avatar URL in database
    await c.env.DB
      .prepare('UPDATE users SET avatar_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(user.id)
      .run();

    return c.json({
      success: true,
      message: 'Avatar removed successfully'
    });
  } catch (err: any) {
    console.error('Avatar delete error:', err?.message || err);
    return c.json({ error: 'Failed to remove avatar' }, 500);
  }
});

// DELETE /upload/cover - Remove cover photo
upload.delete('/cover', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    // Get current cover URL to extract key
    const result = await c.env.DB
      .prepare('SELECT cover_photo_url FROM users WHERE id = ?')
      .bind(user.id)
      .first<{ cover_photo_url: string | null }>();

    if (result?.cover_photo_url) {
      // Extract key from URL and delete from R2
      const url = new URL(result.cover_photo_url);
      const key = url.pathname.slice(1);
      await c.env.MEDIA.delete(key);
    }

    // Clear cover URL in database
    await c.env.DB
      .prepare('UPDATE users SET cover_photo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(user.id)
      .run();

    return c.json({
      success: true,
      message: 'Cover photo removed successfully'
    });
  } catch (err: any) {
    console.error('Cover delete error:', err?.message || err);
    return c.json({ error: 'Failed to remove cover photo' }, 500);
  }
});

export default upload;
