/**
 * @module battle-engine
 * This module contains the core logic for resolving battle turns.
 */

/**
 * A simple seedable pseudo-random number generator.
 * This is used to ensure that battle calculations are deterministic.
 * @param {string} seed - The seed for the random number generator.
 * @returns {() => number} A function that returns a random number between 0 and 1.
 */
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

/**
 * @typedef {object} CharacterStats
 * Represents the core stats of a character involved in a battle.
 * @property {number} hp - Health points.
 * @property {number} atk - Attack power.
 * @property {number} def - Defense power.
 * @property {'phoenix' | 'dphoenix' | 'dragon' | 'ddragon' | 'kies'} class - The character's class.
 */
export type CharacterStats = {
    hp: number;
    atk: number;
    def: number;
    class: 'phoenix' | 'dphoenix' | 'dragon' | 'ddragon' | 'kies';
};

/**
 * @typedef {object} ClassMods
 * Defines the attack and defense modifiers for each character class.
 */
export type ClassMods = {
    [key in CharacterStats['class']]: { attack: number; defense: number };
};

/**
 * @typedef {object} TurnResult
 * Represents the outcome of a single battle turn.
 * @property {number} damage - The amount of damage dealt.
 * @property {boolean} killed - Whether the defender was killed.
 * @property {boolean} attackerWins - True if the attacker dealt damage.
 * @property {boolean} defenderWins - True if the attacker failed to deal damage.
 */
export type TurnResult = {
    damage: number;
    killed: boolean;
    attackerWins: boolean; // True if damage > 0
    defenderWins: boolean; // True if damage <= 0
};

/**
 * Resolves a single turn of a battle, calculating damage based on stats, class modifiers, and a random seed.
 * @param {CharacterStats} attacker - The stats of the attacking character.
 * @param {CharacterStats} defender - The stats of the defending character.
 * @param {ClassMods} classMods - The configured class modifiers.
 * @param {string} seed - A seed for the random number generator to ensure determinism.
 * @param {number} mitigationFactor - A factor to scale the effectiveness of defense.
 * @returns {TurnResult} The result of the turn, including damage dealt and whether the defender was killed.
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
