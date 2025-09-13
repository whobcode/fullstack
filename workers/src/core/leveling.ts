export const XP_PER_LEVEL = 100;

/**
 * Calculates the XP required for a given level.
 * @param level The level.
 * @returns The total XP required to reach that level from level 1.
 */
function getXpForLevel(level: number): number {
    if (level <= 1) return 0;
    // Using a simple exponential growth formula
    return Math.floor(XP_PER_LEVEL * Math.pow(level - 1, 1.5));
}

/**
 * Checks if a character has enough XP to level up and calculates the new state.
 * @param currentLevel The character's current level.
 * @param currentXp The character's current total XP.
 * @returns An object with the new level and the number of stat points gained, or null if no level up.
 */
export function checkForLevelUp(currentLevel: number, currentXp: number): { newLevel: number, pointsGained: number } | null {
    let newLevel = currentLevel;
    let pointsGained = 0;

    let nextLevelXp = getXpForLevel(newLevel + 1);

    while (currentXp >= nextLevelXp) {
        newLevel++;
        // +5 stat points per level, +5 extra on levels 5, 10, 15...
        pointsGained += 5;
        if (newLevel % 5 === 0) {
            pointsGained += 5;
        }
        nextLevelXp = getXpForLevel(newLevel + 1);
    }

    if (newLevel > currentLevel) {
        return { newLevel, pointsGained };
    }

    return null;
}
