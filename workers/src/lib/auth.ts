// Using Web Crypto API for password hashing, available in Cloudflare Workers
// https://developers.cloudflare.com/workers/runtime-apis/web-crypto/

/**
 * Hashes a password using PBKDF2 with a random salt.
 * @param password The password to hash.
 * @returns A string containing the salt and hash, separated by a colon.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const saltArray = Array.from(salt);

  return `${saltArray.join('.')}:${hashArray.join('.')}`;
}

function timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const aBytes = new Uint8Array(a);
  const bBytes = new Uint8Array(b);

  if (aBytes.length !== bBytes.length) return false;

  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

/**
 * Verifies a password against a stored hash.
 * Supports two formats:
 * - Native: "salt.bytes:hash.bytes" (dot-separated byte arrays)
 * - 8hues: "8hues:base64hash:base64salt" (base64-encoded, from 8hues migration)
 * @param password The password to verify.
 * @param storedHash The stored hash (including the salt).
 * @returns True if the password is correct, false otherwise.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();

  // Check if this is an 8hues migrated password
  if (storedHash.startsWith('8hues:')) {
    return verify8huesPassword(password, storedHash);
  }

  // Native format: salt.bytes:hash.bytes
  const [saltStr, hashStr] = storedHash.split(':');
  if (!saltStr || !hashStr) {
    throw new Error('Invalid stored hash format');
  }

  const salt = new Uint8Array(saltStr.split('.').map(s => parseInt(s, 10)));
  const hash = new Uint8Array(hashStr.split('.').map(s => parseInt(s, 10)));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const newHashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  return timingSafeEqual(newHashBuffer, hash.buffer);
}

/**
 * Verifies a password against an 8hues-format hash.
 * Format: "8hues:base64hash:base64salt"
 * 8hues uses PBKDF2-SHA256 with 100000 iterations, base64-encoded.
 */
async function verify8huesPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== '8hues') {
    throw new Error('Invalid 8hues hash format');
  }

  const [, hashB64, saltB64] = parts;
  const encoder = new TextEncoder();

  // Decode base64 to Uint8Array
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const expectedHash = Uint8Array.from(atob(hashB64), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const newHashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  return timingSafeEqual(newHashBuffer, expectedHash.buffer);
}
