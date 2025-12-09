/**
 * @module cron
 * This module handles scheduled tasks, specifically awarding offline XP to characters.
 */
import type { Bindings } from "../bindings";
import { checkForLevelUp } from "./leveling";

/**
 * @interface CharacterWithLedger
 * Represents a character's data along with the timestamp of their last XP award.
 * @property {string} id - The character's unique identifier.
 * @property {number} xp - The character's current experience points.
 * @property {number} level - The character's current level.
 * @property {string} created_at - The timestamp of the character's creation.
 * @property {string | null} last_updated - The timestamp of the last time offline XP was awarded.
 */
interface CharacterWithLedger {
    id: string;
    xp: number;
    level: number;
    created_at: string;
    last_updated: string | null;
}

/**
 * Handles the scheduled cron job to award offline XP to all characters.
 * It calculates the time passed since the last update, awards XP based on a configured rate,
 * respects a daily cap, and triggers level-ups if necessary.
 * @param {Bindings} env - The Cloudflare environment bindings, including the database.
 * @returns {Promise<void>}
 */
export async function handleScheduled(env: Bindings) {
    console.log('Cron job started: Awarding offline XP');
    const db = env.DB;
    const now = new Date();

    try {
        // This query finds all characters and the timestamp of their last XP award.
        const charactersToUpdate = await db.prepare(`
            SELECT c.id, c.xp, c.level, c.created_at, MAX(l.to_ts) as last_updated
            FROM characters c
            LEFT JOIN offline_xp_ledger l ON c.id = l.character_id
            GROUP BY c.id
        `).all<CharacterWithLedger>();

        if (!charactersToUpdate.results) {
            console.log('No characters to update.');
            return;
        }

        const xpRatePerHour = parseInt(env.XP_RATE_PER_HOUR, 10);
        const dailyCap = parseInt(env.DAILY_XP_CAP, 10);

        for (const char of charactersToUpdate.results) {
            const lastUpdated = char.last_updated ? new Date(char.last_updated) : new Date(char.created_at);
            const hoursPassed = Math.min((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60), 24);

            if (hoursPassed <= 0) continue;

            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            const xpEarnedTodayResult = await db.prepare(
                'SELECT SUM(xp_awarded) as total FROM offline_xp_ledger WHERE character_id = ? AND created_at > ?'
            ).bind(char.id, twentyFourHoursAgo).first<{total: number | null}>();

            const xpEarnedToday = xpEarnedTodayResult?.total || 0;

            if (xpEarnedToday >= dailyCap) {
                continue; // Already at or over the daily cap
            }

            const potentialXp = Math.floor(hoursPassed * xpRatePerHour);
            const xpToAward = Math.min(potentialXp, dailyCap - xpEarnedToday);

            if (xpToAward > 0) {
                console.log(`Awarding ${xpToAward} XP to character ${char.id}`);
                const statements = [
                    db.prepare('UPDATE characters SET xp = xp + ? WHERE id = ?').bind(xpToAward, char.id),
                    db.prepare('INSERT INTO offline_xp_ledger (character_id, from_ts, to_ts, xp_awarded) VALUES (?, ?, ?, ?)')
                        .bind(char.id, lastUpdated.toISOString(), now.toISOString(), xpToAward)
                ];

                // Check for level up
                const newTotalXp = char.xp + xpToAward;
                const levelUpResult = checkForLevelUp(char.level, newTotalXp);
                if (levelUpResult) {
                    console.log(`Character ${char.id} leveled up to ${levelUpResult.newLevel}!`);
                    statements.push(
                        db.prepare('UPDATE characters SET level = ?, unspent_stat_points = unspent_stat_points + ? WHERE id = ?')
                            .bind(levelUpResult.newLevel, levelUpResult.pointsGained, char.id)
                    );
                }

                await db.batch(statements);
            }
        }
    } catch (e) {
        console.error('Cron job error:', e);
    }
}
