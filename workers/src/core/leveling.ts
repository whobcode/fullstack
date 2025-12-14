export const XP_PER_LEVEL = 100;
export const MAX_LEVEL = 300;

/**
 * Calculates the XP required for a given level.
 * Uses an exponential curve to make higher levels increasingly challenging.
 *
 * Formula: base * (growthRate ^ (level - 1))
 * - Level 2: ~120 XP
 * - Level 10: ~516 XP
 * - Level 50: ~11,739 XP
 * - Level 100: ~1.15M XP
 * - Level 200: ~13.3B XP
 * - Level 300: ~153T XP (max level - true endgame)
 *
 * @param level The level.
 * @returns The total XP required to reach that level from level 1.
 */
export function getXpForLevel(level: number): number {
    if (level <= 1) return 0;

    // Exponential growth: base 100, growth rate 1.08 per level
    // This creates a challenging curve that requires dedication at higher levels
    const base = 100;
    const growthRate = 1.08;

    return Math.floor(base * Math.pow(growthRate, level - 1));
}

/**
 * Calculates total stat points for a given level.
 * +5 stat points per level, +5 extra on levels divisible by 5.
 * @param level The level to calculate points for.
 * @returns Total stat points earned from level 1 to this level.
 */
export function getTotalStatPointsForLevel(level: number): number {
    if (level <= 1) return 0;

    let totalPoints = 0;
    for (let lvl = 2; lvl <= level; lvl++) {
        totalPoints += 5;
        if (lvl % 5 === 0) {
            totalPoints += 5;
        }
    }
    return totalPoints;
}

/**
 * Get level milestone achievements earned at a specific level.
 * Achievements are granted at levels: 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300
 * @param level The level to check.
 * @returns Array of achievement level thresholds earned at this exact level.
 */
export function getLevelAchievements(level: number): number[] {
    const milestones = [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300];
    return milestones.filter(m => m === level);
}

/**
 * Gets all level achievements earned up to a specific level.
 * @param level The level to check up to.
 * @returns Array of achievement level thresholds earned up to this level.
 */
export function getAllLevelAchievementsUpTo(level: number): number[] {
    const milestones = [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300];
    return milestones.filter(m => m <= level);
}

/**
 * Checks if a character has enough XP to level up and calculates the new state.
 * @param currentLevel The character's current level.
 * @param currentXp The character's current total XP.
 * @returns An object with the new level and the number of stat points gained, or null if no level up.
 */
export function checkForLevelUp(currentLevel: number, currentXp: number): { newLevel: number, pointsGained: number, achievementsEarned: number[] } | null {
    let newLevel = currentLevel;
    let pointsGained = 0;
    const achievementsEarned: number[] = [];

    // Don't level past max level
    if (currentLevel >= MAX_LEVEL) {
        return null;
    }

    let nextLevelXp = getXpForLevel(newLevel + 1);

    while (currentXp >= nextLevelXp && newLevel < MAX_LEVEL) {
        newLevel++;
        // +5 stat points per level, +5 extra on levels divisible by 5
        pointsGained += 5;
        if (newLevel % 5 === 0) {
            pointsGained += 5;
        }

        // Check for level achievements
        const achievements = getLevelAchievements(newLevel);
        achievementsEarned.push(...achievements);

        nextLevelXp = getXpForLevel(newLevel + 1);
    }

    if (newLevel > currentLevel) {
        return { newLevel, pointsGained, achievementsEarned };
    }

    return null;
}
