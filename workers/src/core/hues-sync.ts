import type { Bindings } from "../bindings";
import { buildInitialCharacter, generateUniqueUsername, SPECIAL_USERNAMES } from "../api/auth";

// Every 8hues member gets a shade account. 8hues (hue_green_db) never calls
// into this worker, so the shade side pulls: each cron tick diffs the 8hues
// member list against ours and creates whoever is missing. A full diff rather
// than a "since last run" watermark, so a tick that fails is simply caught up
// by the next one.

interface HuesMember {
    id: string;
    email: string;
    handle: string;
    pass_hash: string;
    pass_salt: string;
    verified: number | null;
    created_at: number | null;
}

// Cap per tick so one run stays well inside the cron's CPU budget even if a
// large batch of members lands at once; the rest follow on the next tick.
const MAX_PER_TICK = 50;

// Shade usernames follow the register form's rules: 3-20 of [A-Za-z0-9_].
// 8hues handles are free text ("dom top", "yahya...."), so spaces become
// underscores and anything else outside the set is dropped. The base is kept
// to 16 so generateUniqueUsername's numeric suffix still fits in 20.
function usernameFromHandle(handle: string, email: string): string {
    const clean = (s: string) => s.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').replace(/_+/g, '_');
    let base = clean(handle) || clean(email.split('@')[0]) || 'member';
    base = base.slice(0, 16);
    while (base.length < 3) base += '0';
    return base;
}

// 8hues stores created_at as epoch seconds or ms; shade uses SQLite's
// CURRENT_TIMESTAMP text form.
function toSqlTimestamp(created: number | null): string | null {
    if (!created) return null;
    const ms = created > 1e11 ? created : created * 1000;
    return new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
}

export async function syncHuesMembers(env: Bindings): Promise<{ created: number; pending: number }> {
    const members = await env.HUES_DB.prepare(`
        SELECT id, lower(email) AS email, handle, pass_hash, pass_salt, verified, created_at
        FROM users
        WHERE coalesce(banned, 0) = 0
        ORDER BY created_at
    `).all<HuesMember>();

    const existing = await env.DB.prepare('SELECT id, lower(email) AS email FROM users').all<{ id: string; email: string }>();
    const takenEmails = new Set(existing.results.map(u => u.email));
    const takenIds = new Set(existing.results.map(u => u.id));

    const missing = members.results.filter(m => !takenEmails.has(m.email) && !takenIds.has(m.id));
    let created = 0;

    for (const m of missing.slice(0, MAX_PER_TICK)) {
        try {
            const db = env.DB;
            // Reuse the 8hues id, as the original import did, so the two
            // accounts stay linkable without a mapping table.
            const userId = m.id;
            const characterId = crypto.randomUUID();
            const username = await generateUniqueUsername(db, usernameFromHandle(m.handle, m.email));
            const characterStmt = await buildInitialCharacter(db, characterId, userId, username, SPECIAL_USERNAMES.includes(username.toLowerCase()));

            // "8hues:hash:salt" is verified by lib/auth.ts, so members sign in
            // here with the same password they use on 8hues.
            await db.batch([
                db.prepare(
                    'INSERT INTO users (id, email, username, email_verified, password_hash, created_at) VALUES (?, ?, ?, ?, ?, coalesce(?, CURRENT_TIMESTAMP))'
                ).bind(userId, m.email, username, !!m.verified, `8hues:${m.pass_hash}:${m.pass_salt}`, toSqlTimestamp(m.created_at)),
                characterStmt,
                db.prepare('INSERT INTO trophies (character_id) VALUES (?)').bind(characterId),
            ]);
            created += 1;
            console.log(`8hues sync: created ${username} for 8hues member ${m.id}`);
        } catch (e) {
            // One bad row (e.g. a concurrent signup taking the email) must not
            // stop the rest; it is retried on the next tick.
            console.error(`8hues sync: failed for 8hues member ${m.id}:`, e);
        }
    }

    return { created, pending: missing.length - created };
}
