-- The character a user is currently "playing as" — everything they do in the
-- game defaults to this character until they switch.
ALTER TABLE users ADD COLUMN active_character_id TEXT;

-- Comments left on a user's gamer profile (by anyone, including themselves).
CREATE TABLE IF NOT EXISTS profile_comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    profile_user_id TEXT NOT NULL,   -- whose profile the comment is on
    author_user_id TEXT NOT NULL,    -- who wrote it
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_profile_comments_profile ON profile_comments(profile_user_id, created_at);
