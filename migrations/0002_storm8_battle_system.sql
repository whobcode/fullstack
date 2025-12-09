-- Storm8-Inspired Battle System Migration
-- Implements: Stat scaling, clan system, brackets, stamina/energy, hitlist mechanics

-- ============================================================================
-- MODIFY CHARACTERS TABLE: Add Storm8-style stats
-- ============================================================================

-- Add new stat columns for the 5-stat system
ALTER TABLE characters ADD COLUMN attack_skill_points INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN defense_skill_points INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN health_skill_points INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN energy_skill_points INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN stamina_skill_points INTEGER DEFAULT 0;

-- Resource pools with regeneration tracking
ALTER TABLE characters ADD COLUMN current_health INTEGER DEFAULT 100;
ALTER TABLE characters ADD COLUMN max_health INTEGER DEFAULT 100;
ALTER TABLE characters ADD COLUMN current_energy INTEGER DEFAULT 20;
ALTER TABLE characters ADD COLUMN max_energy INTEGER DEFAULT 20;
ALTER TABLE characters ADD COLUMN current_stamina INTEGER DEFAULT 5;
ALTER TABLE characters ADD COLUMN max_stamina INTEGER DEFAULT 5;

-- Regeneration tracking
ALTER TABLE characters ADD COLUMN last_energy_regen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE characters ADD COLUMN last_stamina_regen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Currency system (unbanked vs banked)
ALTER TABLE characters ADD COLUMN unbanked_currency INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN banked_currency INTEGER DEFAULT 0;

-- ============================================================================
-- CLAN SYSTEM
-- ============================================================================

-- Clan members table: Each character has clan members (just numbers, not other players)
CREATE TABLE clan_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    member_index INTEGER NOT NULL, -- 1, 2, 3, etc.
    is_active BOOLEAN DEFAULT TRUE, -- Inactive members still count for bracket
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE (character_id, member_index)
);
CREATE INDEX idx_clan_members_character ON clan_members(character_id);

-- Abilities/Equipment table: Items that boost attack/defense
CREATE TABLE abilities (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    category TEXT CHECK(category IN ('physical', 'sensory', 'transformation')) NOT NULL,
    attack_value INTEGER DEFAULT 0,
    defense_value INTEGER DEFAULT 0,
    cost INTEGER DEFAULT 0, -- Purchase cost
    level_requirement INTEGER DEFAULT 1,
    description TEXT
);

-- Character abilities: What equipment/abilities a character owns
CREATE TABLE character_abilities (
    character_id TEXT NOT NULL,
    ability_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (character_id, ability_id),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (ability_id) REFERENCES abilities(id) ON DELETE CASCADE
);
CREATE INDEX idx_character_abilities_character ON character_abilities(character_id);

-- ============================================================================
-- BATTLE FEED SYSTEM
-- ============================================================================

-- Battle feed: Shows recent attack results
CREATE TABLE battle_feed (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL, -- Who sees this feed entry
    battle_id TEXT,
    attacker_id TEXT NOT NULL,
    defender_id TEXT NOT NULL,
    attacker_won BOOLEAN NOT NULL,
    damage_dealt INTEGER NOT NULL,
    currency_stolen INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE SET NULL,
    FOREIGN KEY (attacker_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (defender_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX idx_battle_feed_character ON battle_feed(character_id, created_at DESC);

-- ============================================================================
-- HITLIST SYSTEM
-- ============================================================================

-- Hitlist entries: Bounty hunting system
CREATE TABLE hitlist (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    target_character_id TEXT NOT NULL,
    posted_by_character_id TEXT NOT NULL,
    bounty_amount INTEGER NOT NULL,
    state TEXT CHECK(state IN ('active', 'claimed', 'expired')) DEFAULT 'active',
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    claimed_at TIMESTAMP,
    claimed_by_character_id TEXT,
    FOREIGN KEY (target_character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (posted_by_character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (claimed_by_character_id) REFERENCES characters(id) ON DELETE SET NULL
);
CREATE INDEX idx_hitlist_target ON hitlist(target_character_id);
CREATE INDEX idx_hitlist_state ON hitlist(state);

-- Hitlist attack log: Track daily attack limits
CREATE TABLE hitlist_attacks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    hitlist_id TEXT NOT NULL,
    attacker_character_id TEXT NOT NULL,
    damage_dealt INTEGER NOT NULL,
    target_killed BOOLEAN DEFAULT FALSE,
    attacked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hitlist_id) REFERENCES hitlist(id) ON DELETE CASCADE,
    FOREIGN KEY (attacker_character_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX idx_hitlist_attacks_hitlist ON hitlist_attacks(hitlist_id);
CREATE INDEX idx_hitlist_attacks_daily_limit ON hitlist_attacks(attacker_character_id, hitlist_id, attacked_at);

-- ============================================================================
-- MISSIONS/INCOME SYSTEM (PvE Content)
-- ============================================================================

-- Missions table: PvE content for earning currency and XP
CREATE TABLE missions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    energy_cost INTEGER NOT NULL,
    level_requirement INTEGER DEFAULT 1,
    currency_reward_min INTEGER DEFAULT 0,
    currency_reward_max INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 0,
    mastery_bonus_json TEXT, -- JSON: {"energy_timer_reduction": 30, "hospital_discount": 50}
    display_order INTEGER DEFAULT 0
);

-- Mission completions: Track mastery progress
CREATE TABLE mission_completions (
    character_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    completion_count INTEGER DEFAULT 0,
    mastered BOOLEAN DEFAULT FALSE,
    first_completed_at TIMESTAMP,
    last_completed_at TIMESTAMP,
    PRIMARY KEY (character_id, mission_id),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

-- ============================================================================
-- PROTECTION THRESHOLD TRACKING
-- ============================================================================

-- Protection log: Track when characters are in "ER" protection
CREATE TABLE protection_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    protection_type TEXT CHECK(protection_type IN ('er_limit', 'none')) DEFAULT 'none',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX idx_protection_log_character ON protection_log(character_id);

-- ============================================================================
-- SKILL POINT ALLOCATION LOG
-- ============================================================================

-- Track skill point allocation history
CREATE TABLE skill_allocations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    stat_type TEXT CHECK(stat_type IN ('attack', 'defense', 'health', 'energy', 'stamina')) NOT NULL,
    points_allocated INTEGER NOT NULL,
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX idx_skill_allocations_character ON skill_allocations(character_id);

-- ============================================================================
-- UPDATE BATTLES TABLE
-- ============================================================================

-- Add Storm8-specific battle metadata
ALTER TABLE battles ADD COLUMN battle_type TEXT CHECK(battle_type IN ('normal', 'hitlist')) DEFAULT 'normal';
ALTER TABLE battles ADD COLUMN currency_stolen INTEGER DEFAULT 0;
ALTER TABLE battles ADD COLUMN attacker_health_after INTEGER;
ALTER TABLE battles ADD COLUMN defender_health_after INTEGER;

-- ============================================================================
-- SEED SOME STARTER ABILITIES
-- ============================================================================

INSERT INTO abilities (name, category, attack_value, defense_value, cost, level_requirement, description) VALUES
-- Physical abilities
('Basic Strike', 'physical', 10, 5, 0, 1, 'A simple physical attack'),
('Power Slash', 'physical', 25, 10, 500, 3, 'A powerful slashing attack'),
('Titan Blow', 'physical', 50, 15, 2000, 7, 'Devastating physical damage'),
('Legendary Assault', 'physical', 100, 25, 10000, 15, 'The ultimate physical strike'),

-- Sensory abilities
('Keen Senses', 'sensory', 8, 12, 0, 1, 'Heightened awareness'),
('Mind Shield', 'sensory', 15, 30, 500, 3, 'Mental fortification'),
('Sixth Sense', 'sensory', 30, 60, 2000, 7, 'Precognitive defense'),
('Omniscience', 'sensory', 60, 120, 10000, 15, 'Perfect awareness'),

-- Transformation abilities
('Minor Form', 'transformation', 12, 8, 0, 1, 'Basic transformation'),
('Battle Form', 'transformation', 30, 20, 500, 3, 'Combat-ready transformation'),
('War Form', 'transformation', 60, 40, 2000, 7, 'Devastating battle form'),
('Apex Form', 'transformation', 120, 80, 10000, 15, 'Ultimate transformation');
