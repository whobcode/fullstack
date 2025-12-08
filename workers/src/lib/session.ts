const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Creates a new session for a user.
 * @param db The D1 database instance.
 * @param userId The ID of the user to create the session for.
 * @returns The raw session token (to be sent to the user).
 */
export async function createSession(db: D1Database, userId: string): Promise<string> {
  const rawToken = generateSessionToken();
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_SECONDS * 1000);

  await db
    .prepare(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    )
    .bind(
      crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt.toISOString()
    )
    .run();

  return rawToken;
}

/**
 * Generates a cryptographically secure random string to be used as a session token.
 */
function generateSessionToken(): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return btoa(String.fromCharCode(...buffer));
}

/**
 * Hashes a session token using SHA-256 for safe storage.
 * @param token The raw session token.
 * @returns The hex-encoded hash of the token.
 */
export async function hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
