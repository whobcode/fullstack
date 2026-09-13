/**
 * Hitlist listing limits and "globalling".
 *
 * Globalling is the term for maxing out how many times a character can be put
 * on the hitlist in a day. Two limits interact:
 *
 *   - a target can be listed at most MAX_LISTINGS_PER_TARGET (200) times per
 *     rolling 24h;
 *   - any one poster can only put MAX_LISTINGS_PER_POSTER (25) bounties on the
 *     same target in that window.
 *
 * 200 / 25 = 8, so globalling someone takes at least eight different
 * characters banding together. Hitting the ceiling locks the target out of the
 * hitlist for GLOBAL_COOLDOWN_HOURS and awards them a global trophy — it reads
 * as notoriety earned, not as a punishment.
 */

/** Listings one character can receive per rolling 24h before being globalled. */
export const MAX_LISTINGS_PER_TARGET = 200;

/** Bounties a single poster may put on one target per rolling 24h. */
export const MAX_LISTINGS_PER_POSTER = 25;

/** How long a globalled character is un-listable. */
export const GLOBAL_COOLDOWN_HOURS = 24;

/** The fewest characters that can global someone: 200 / 25 = 8. */
export const MIN_POSTERS_TO_GLOBAL = Math.ceil(MAX_LISTINGS_PER_TARGET / MAX_LISTINGS_PER_POSTER);

/**
 * SQLite modifier for the rolling window, e.g. "-24 hours".
 *
 * The window bound is computed by SQLite rather than bound as an ISO string on
 * purpose. `posted_at` defaults to CURRENT_TIMESTAMP, which SQLite writes as
 * "YYYY-MM-DD HH:MM:SS" — comparing that against a JS toISOString() value
 * compares ' ' (0x20) with 'T' (0x54) once the date halves match, so every row
 * sharing a calendar date with the cutoff silently drops out of the count.
 * Keeping both sides in SQLite's own format avoids that entirely.
 */
const WINDOW_MODIFIER = `-${GLOBAL_COOLDOWN_HOURS} hours`;

export interface GlobalStatus {
  /** Listings against this target inside the rolling window. */
  listed_count: number;
  /** Distinct characters who posted those listings. */
  distinct_posters: number;
  /** Listings remaining before the target is globalled. */
  listings_remaining: number;
  /** Cooldown expiry, or null when the target is listable. */
  globalled_until: string | null;
  /** True while the target cannot be listed. */
  is_globalled: boolean;
}

/**
 * Current hitlist saturation for a target. Safe to call for display — it does
 * not mutate anything.
 */
export async function getGlobalStatus(db: D1Database, targetId: string, now = new Date()): Promise<GlobalStatus> {
  const counts = await db
    .prepare(`
      SELECT COUNT(*) AS listed, COUNT(DISTINCT posted_by_character_id) AS posters
      FROM hitlist
      WHERE target_character_id = ? AND posted_at >= datetime('now', ?)
    `)
    .bind(targetId, WINDOW_MODIFIER)
    .first<{ listed: number; posters: number }>();

  const target = await db
    .prepare('SELECT globalled_until FROM characters WHERE id = ?')
    .bind(targetId)
    .first<{ globalled_until: string | null }>();

  const listed = counts?.listed ?? 0;
  const until = target?.globalled_until ?? null;
  const active = !!until && new Date(until).getTime() > now.getTime();

  return {
    listed_count: listed,
    distinct_posters: counts?.posters ?? 0,
    listings_remaining: Math.max(0, MAX_LISTINGS_PER_TARGET - listed),
    globalled_until: active ? until : null,
    is_globalled: active,
  };
}

export interface ListingCheck {
  ok: boolean;
  error?: string;
  status: GlobalStatus;
  /** Listings this poster has already placed on the target in the window. */
  from_this_poster: number;
}

/**
 * Whether `posterId` may put another bounty on `targetId` right now.
 */
export async function canList(
  db: D1Database,
  posterId: string,
  targetId: string,
  now = new Date(),
): Promise<ListingCheck> {
  const status = await getGlobalStatus(db, targetId, now);

  const mine = await db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM hitlist
      WHERE posted_by_character_id = ? AND target_character_id = ? AND posted_at >= datetime('now', ?)
    `)
    .bind(posterId, targetId, WINDOW_MODIFIER)
    .first<{ count: number }>();

  const fromThisPoster = mine?.count ?? 0;

  if (status.is_globalled) {
    return {
      ok: false,
      error: `This character has been globalled — they cannot be listed again until ${status.globalled_until}.`,
      status,
      from_this_poster: fromThisPoster,
    };
  }

  if (fromThisPoster >= MAX_LISTINGS_PER_POSTER) {
    return {
      ok: false,
      error: `You have already placed ${MAX_LISTINGS_PER_POSTER} bounties on this character today. It takes other players to global them.`,
      status,
      from_this_poster: fromThisPoster,
    };
  }

  if (status.listed_count >= MAX_LISTINGS_PER_TARGET) {
    return {
      ok: false,
      error: 'This character has already been listed the maximum number of times today.',
      status,
      from_this_poster: fromThisPoster,
    };
  }

  return { ok: true, status, from_this_poster: fromThisPoster };
}

export interface GloballedEvent {
  listed_count: number;
  distinct_posters: number;
  cooldown_until: string;
}

/**
 * Called immediately after a listing is inserted. If that listing was the one
 * that hit the ceiling, records the globalling event, starts the cooldown and
 * awards the trophy. Returns the event when it fired, otherwise null.
 */
export async function recordGlobalIfSaturated(
  db: D1Database,
  targetId: string,
  now = new Date(),
): Promise<GloballedEvent | null> {
  const counts = await db
    .prepare(`
      SELECT COUNT(*) AS listed, COUNT(DISTINCT posted_by_character_id) AS posters
      FROM hitlist
      WHERE target_character_id = ? AND posted_at >= datetime('now', ?)
    `)
    .bind(targetId, WINDOW_MODIFIER)
    .first<{ listed: number; posters: number }>();

  const listed = counts?.listed ?? 0;
  if (listed < MAX_LISTINGS_PER_TARGET) return null;

  // Don't re-fire for a target already serving a cooldown.
  const existing = await db
    .prepare('SELECT globalled_until FROM characters WHERE id = ?')
    .bind(targetId)
    .first<{ globalled_until: string | null }>();
  if (existing?.globalled_until && new Date(existing.globalled_until).getTime() > now.getTime()) {
    return null;
  }

  const cooldownUntil = new Date(now.getTime() + GLOBAL_COOLDOWN_HOURS * 3600_000).toISOString();
  const posters = counts?.posters ?? 0;

  await db.batch([
    db.prepare('UPDATE characters SET globalled_until = ? WHERE id = ?').bind(cooldownUntil, targetId),
    db
      .prepare(`
        INSERT INTO character_globals (character_id, listed_count, distinct_posters, cooldown_until)
        VALUES (?, ?, ?, ?)
      `)
      .bind(targetId, listed, posters, cooldownUntil),
    db
      .prepare(`
        INSERT INTO trophies (character_id, globals) VALUES (?, 1)
        ON CONFLICT(character_id) DO UPDATE SET globals = globals + 1
      `)
      .bind(targetId),
  ]);

  return { listed_count: listed, distinct_posters: posters, cooldown_until: cooldownUntil };
}
