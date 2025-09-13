// A simple seedable pseudo-random number generator.
function seededRandom(seed: string) {
    let h = 1779033703, i = 0, char;
    for (i = 0; i < seed.length; i++) {
        char = seed.charCodeAt(i);
        h = (h ^ char) * 16777619;
    }
    return () => {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
}

export type CharacterStats = {
    hp: number;
    atk: number;
    def: number;
    class: 'phoenix' | 'dphoenix' | 'dragon' | 'ddragon' | 'kies';
};

export type ClassMods = {
    [key in CharacterStats['class']]: { attack: number; defense: number };
};

export type TurnResult = {
    damage: number;
    killed: boolean;
    attackerWins: boolean; // True if damage > 0
    defenderWins: boolean; // True if damage <= 0
};

/**
 * Resolves a single turn of a battle.
 * @param attacker The stats of the attacking character.
 * @param defender The stats of the defending character.
 * @param classMods The configured class modifiers.
 * @param seed A seed for the random number generator to ensure determinism.
 * @returns The result of the turn.
 */
export function resolveTurn(
    attacker: CharacterStats,
    defender: CharacterStats,
    classMods: ClassMods,
    seed: string,
    mitigationFactor: number
): TurnResult {
    const random = seededRandom(seed);

    const attackerMod = classMods[attacker.class];
    const defenderMod = classMods[defender.class];

    const effectiveAtk = attacker.atk * attackerMod.attack;
    const effectiveDef = defender.def * defenderMod.defense;

    // Add +/- 5% jitter
    const jitter = 1 + (random() * 0.1 - 0.05);

    let damage = Math.round((effectiveAtk - effectiveDef * mitigationFactor) * jitter);
    if (damage < 0) {
        damage = 0;
    }

    if (damage > 0) {
        const defenderHpAfter = defender.hp - damage;
        return {
            damage,
            killed: defenderHpAfter <= 0,
            attackerWins: true,
            defenderWins: false,
        };
    } else {
        return {
            damage: 0,
            killed: false,
            attackerWins: false,
            defenderWins: true,
        };
    }
}
