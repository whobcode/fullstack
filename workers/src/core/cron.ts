import type { Bindings } from "../bindings";
import { checkForLevelUp } from "./leveling";

interface CharacterWithLedger {
    id: string;
    xp: number;
    level: number;
    created_at: string;
    last_updated: string | null;
}

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
