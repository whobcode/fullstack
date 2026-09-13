-- 0021: Globalling (hitlist saturation) + per-character comment walls.
--
-- "Globalling" is the term for maxing out how many times a character can be
-- placed on the hitlist in a day. The ceiling is 200 listings per target per
-- 24h, and any single poster may only put 25 bounties on the same target in
-- that window — so it takes at least 8 different characters banding together
-- to global someone. Hitting 200 locks the target out of being listed again
-- for 24 hours and awards them a global trophy (notoriety, not a penalty).

-- ---------------------------------------------------------------------------
-- Global trophy
-- ---------------------------------------------------------------------------
ALTER TABLE trophies ADD COLUMN globals INTEGER DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Cooldown. Set when a character is globalled; while it is in the future the
-- character cannot be added to the hitlist again.
-- ---------------------------------------------------------------------------
ALTER TABLE characters ADD COLUMN globalled_until TIMESTAMP;

-- One row per globalling event, so a character's notoriety has a history and
-- the profile can show who banded together and when.
CREATE TABLE character_globals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    listed_count INTEGER NOT NULL,      -- listings in the window that triggered it (200)
    distinct_posters INTEGER NOT NULL,  -- how many characters it took (>= 8)
    globalled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cooldown_until TIMESTAMP NOT NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX idx_character_globals_character ON character_globals(character_id, globalled_at DESC);

-- The two rolling-window counts run on every bounty post, so index for them.
CREATE INDEX idx_hitlist_target_posted ON hitlist(target_character_id, posted_at);
CREATE INDEX idx_hitlist_poster_target ON hitlist(posted_by_character_id, target_character_id, posted_at);

-- ---------------------------------------------------------------------------
-- Per-character comment walls
--
-- profile_comments was keyed to the user, so every character a user owned
-- shared one wall. Each character gets its own wall now. The old column stays
-- for the delete-permission check (the profile owner can always remove).
-- ---------------------------------------------------------------------------
ALTER TABLE profile_comments ADD COLUMN profile_character_id TEXT REFERENCES characters(id) ON DELETE CASCADE;
CREATE INDEX idx_profile_comments_character ON profile_comments(profile_character_id, created_at DESC);

-- Existing comments are attributed to the owner's active character, falling
-- back to their first slot, so no wall reads as empty after the split.
UPDATE profile_comments
SET profile_character_id = COALESCE(
    (SELECT u.active_character_id FROM users u WHERE u.id = profile_comments.profile_user_id),
    (SELECT c.id FROM characters c WHERE c.user_id = profile_comments.profile_user_id ORDER BY c.slot_number LIMIT 1)
)
WHERE profile_character_id IS NULL;
