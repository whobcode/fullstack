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
 * @param password The password to verify.
 * @param storedHash The stored hash (including the salt).
 * @returns True if the password is correct, false otherwise.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltStr, hashStr] = storedHash.split(':');
  if (!saltStr || !hashStr) {
    throw new Error('Invalid stored hash format');
  }

  const salt = new Uint8Array(saltStr.split('.').map(s => parseInt(s, 10)));
  const hash = new Uint8Array(hashStr.split('.').map(s => parseInt(s, 10)));
  const encoder = new TextEncoder();

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
