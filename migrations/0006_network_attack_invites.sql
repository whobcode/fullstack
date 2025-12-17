-- Network attack + invite tracking
-- Tracks off-platform attacks (e.g., Facebook) and auto-invite tokens

CREATE TABLE network_attack_invites (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    attacker_user_id TEXT NOT NULL,
    attacker_char_id TEXT NOT NULL,
    target_network TEXT NOT NULL, -- e.g., 'facebook'
    target_external_id TEXT NOT NULL, -- platform-specific user id
    target_display_name TEXT,
    target_profile_url TEXT,
    invite_token TEXT NOT NULL UNIQUE,
    attacker_level_snapshot INTEGER NOT NULL,
    attacker_xp_snapshot INTEGER DEFAULT 0,
    reward_xp_awarded INTEGER DEFAULT 0,
    reward_currency_awarded INTEGER DEFAULT 0,
    reward_issued BOOLEAN DEFAULT FALSE,
    message_status TEXT CHECK(message_status IN ('pending', 'sent', 'failed', 'skipped')) DEFAULT 'pending',
    message_error TEXT,
    target_registered_user_id TEXT,
    target_registered_character_id TEXT,
    target_registered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attacker_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (attacker_char_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Index for 24h cap enforcement
CREATE INDEX idx_network_invites_attacker_time ON network_attack_invites(attacker_char_id, created_at DESC);
CREATE INDEX idx_network_invites_token ON network_attack_invites(invite_token);
CREATE INDEX idx_network_invites_target ON network_attack_invites(target_network, target_external_id);

-- Track invite provenance on characters created from an attack invite
ALTER TABLE characters ADD COLUMN invite_token_used TEXT;
ALTER TABLE characters ADD COLUMN invite_network TEXT;
ALTER TABLE characters ADD COLUMN invite_attacker_char_id TEXT;
ALTER TABLE characters ADD COLUMN invite_level_snapshot INTEGER;
