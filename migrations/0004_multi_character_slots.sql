-- Multi-Character Slot System Migration
-- Implements: 7 character slots (3 free, 4 purchasable), level 300 cap, special accounts

-- ============================================================================
-- REMOVE UNIQUE CONSTRAINT ON CHARACTERS.USER_ID
-- D1/SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to recreate
-- ============================================================================

-- Step 1: Create new characters table without UNIQUE on user_id
CREATE TABLE characters_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    slot_number INTEGER NOT NULL DEFAULT 1, -- 1-7 slots
    gamertag TEXT UNIQUE,
    class TEXT CHECK(class IN ('phoenix', 'dphoenix', 'dragon', 'ddragon', 'kies')),
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    hp INTEGER,
    atk INTEGER,
    def INTEGER,
    mp INTEGER,
    spd INTEGER,
    unspent_stat_points INTEGER DEFAULT 0,
    first_game_access_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Storm8-style stats (from migration 0002)
    attack_skill_points INTEGER DEFAULT 0,
    defense_skill_points INTEGER DEFAULT 0,
    health_skill_points INTEGER DEFAULT 0,
    energy_skill_points INTEGER DEFAULT 0,
    stamina_skill_points INTEGER DEFAULT 0,
    current_health INTEGER DEFAULT 100,
    max_health INTEGER DEFAULT 100,
    current_energy INTEGER DEFAULT 20,
    max_energy INTEGER DEFAULT 20,
    current_stamina INTEGER DEFAULT 5,
    max_stamina INTEGER DEFAULT 5,
    last_energy_regen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_stamina_regen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unbanked_currency INTEGER DEFAULT 0,
    banked_currency INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, slot_number) -- Enforce one character per slot per user
);

-- Step 2: Copy existing data (existing characters go to slot 1)
INSERT INTO characters_new (
    id, user_id, slot_number, gamertag, class, level, xp, hp, atk, def, mp, spd,
    unspent_stat_points, first_game_access_completed, created_at, updated_at,
    attack_skill_points, defense_skill_points, health_skill_points,
    energy_skill_points, stamina_skill_points, current_health, max_health,
    current_energy, max_energy, current_stamina, max_stamina,
    last_energy_regen, last_stamina_regen, unbanked_currency, banked_currency
)
SELECT
    id, user_id, 1 as slot_number, gamertag, class, level, xp, hp, atk, def, mp, spd,
    unspent_stat_points, first_game_access_completed, created_at, updated_at,
    COALESCE(attack_skill_points, 0), COALESCE(defense_skill_points, 0),
    COALESCE(health_skill_points, 0), COALESCE(energy_skill_points, 0),
    COALESCE(stamina_skill_points, 0), COALESCE(current_health, 100),
    COALESCE(max_health, 100), COALESCE(current_energy, 20),
    COALESCE(max_energy, 20), COALESCE(current_stamina, 5),
    COALESCE(max_stamina, 5), COALESCE(last_energy_regen, CURRENT_TIMESTAMP),
    COALESCE(last_stamina_regen, CURRENT_TIMESTAMP), COALESCE(unbanked_currency, 0),
    COALESCE(banked_currency, 0)
FROM characters;

-- Step 3: Drop old table and rename
DROP TABLE characters;
ALTER TABLE characters_new RENAME TO characters;

-- Step 4: Recreate indexes
CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_characters_gamertag ON characters(gamertag);
CREATE INDEX idx_characters_slot ON characters(user_id, slot_number);

-- ============================================================================
-- CHARACTER SLOT PURCHASES
-- ============================================================================

-- Track purchased character slots per user
CREATE TABLE character_slot_purchases (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    slot_number INTEGER NOT NULL, -- 4, 5, 6, or 7
    price_paid INTEGER NOT NULL, -- In cents: 500, 1000, 1500, 2000
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_id TEXT, -- For payment processing reference
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, slot_number)
);
CREATE INDEX idx_slot_purchases_user ON character_slot_purchases(user_id);

-- ============================================================================
-- SPECIAL ACCOUNT FLAGS
-- ============================================================================

-- Track special accounts with elevated privileges
CREATE TABLE special_accounts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL UNIQUE,
    flag_type TEXT NOT NULL, -- 'admin', 'developer', 'founder', etc.
    all_slots_unlocked BOOLEAN DEFAULT FALSE,
    auto_max_level BOOLEAN DEFAULT FALSE, -- New characters auto level 300
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by TEXT, -- Admin who granted the flag (if applicable)
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_special_accounts_user ON special_accounts(user_id);

-- ============================================================================
-- LEVEL UP ACHIEVEMENTS
-- ============================================================================

-- Achievement definitions
CREATE TABLE achievements (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT CHECK(category IN ('level', 'battle', 'social', 'special')) NOT NULL,
    requirement_json TEXT, -- JSON: {"type": "level", "value": 50}
    reward_json TEXT, -- JSON: {"type": "currency", "value": 1000}
    icon_url TEXT,
    display_order INTEGER DEFAULT 0
);

-- Character achievements earned
CREATE TABLE character_achievements (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE (character_id, achievement_id)
);
CREATE INDEX idx_character_achievements_character ON character_achievements(character_id);

-- ============================================================================
-- SEED LEVEL ACHIEVEMENTS (every 25 levels up to 300)
-- ============================================================================

INSERT INTO achievements (name, description, category, requirement_json, reward_json, display_order) VALUES
('Novice', 'Reach level 25', 'level', '{"type": "level", "value": 25}', '{"type": "title", "value": "Novice"}', 1),
('Apprentice', 'Reach level 50', 'level', '{"type": "level", "value": 50}', '{"type": "title", "value": "Apprentice"}', 2),
('Journeyman', 'Reach level 75', 'level', '{"type": "level", "value": 75}', '{"type": "title", "value": "Journeyman"}', 3),
('Adept', 'Reach level 100', 'level', '{"type": "level", "value": 100}', '{"type": "title", "value": "Adept"}', 4),
('Expert', 'Reach level 125', 'level', '{"type": "level", "value": 125}', '{"type": "title", "value": "Expert"}', 5),
('Veteran', 'Reach level 150', 'level', '{"type": "level", "value": 150}', '{"type": "title", "value": "Veteran"}', 6),
('Elite', 'Reach level 175', 'level', '{"type": "level", "value": 175}', '{"type": "title", "value": "Elite"}', 7),
('Champion', 'Reach level 200', 'level', '{"type": "level", "value": 200}', '{"type": "title", "value": "Champion"}', 8),
('Master', 'Reach level 225', 'level', '{"type": "level", "value": 225}', '{"type": "title", "value": "Master"}', 9),
('Grandmaster', 'Reach level 250', 'level', '{"type": "level", "value": 250}', '{"type": "title", "value": "Grandmaster"}', 10),
('Legend', 'Reach level 275', 'level', '{"type": "level", "value": 275}', '{"type": "title", "value": "Legend"}', 11),
('Mythic', 'Reach level 300', 'level', '{"type": "level", "value": 300}', '{"type": "title", "value": "Mythic"}', 12);

-- ============================================================================
-- STORY MODE PROGRESS (Placeholder for future)
-- ============================================================================

-- Story chapters table (coming soon)
CREATE TABLE story_chapters (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    chapter_number INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    unlock_level INTEGER DEFAULT 1,
    is_available BOOLEAN DEFAULT FALSE, -- Set to FALSE - coming soon
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Character story progress
CREATE TABLE character_story_progress (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES story_chapters(id) ON DELETE CASCADE,
    UNIQUE (character_id, chapter_id)
);
CREATE INDEX idx_story_progress_character ON character_story_progress(character_id);

-- Insert placeholder chapter
INSERT INTO story_chapters (chapter_number, title, description, unlock_level, is_available) VALUES
(1, 'Coming Soon', 'The story mode is being written. Check back soon for an epic adventure!', 1, FALSE);

-- ============================================================================
-- GRANT TRUBONE SPECIAL ACCOUNT STATUS
-- Note: This must be run after the user 'trubone' exists in the database.
-- The INSERT will be ignored if the user doesn't exist yet.
-- ============================================================================

-- Insert special account flag for trubone (will be matched by username at runtime)
-- This creates a trigger-like behavior via API when trubone logs in
