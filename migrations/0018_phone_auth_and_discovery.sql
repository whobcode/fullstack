-- Phone-number login, plus contact- and location-based friend discovery.

-- Phone number, normalized to E.164 (e.g. +14155550123) before it is stored.
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;

-- Keyed (HMAC) hash of the E.164 number. Contact matching compares these
-- instead of raw numbers, so a dump of this table alone does not hand an
-- attacker a reversible phone list -- the key lives in the PHONE_HASH_PEPPER
-- secret, not in the database. A plain unkeyed hash would be pointless here:
-- the phone number space is small enough to brute-force in seconds.
ALTER TABLE users ADD COLUMN phone_hash TEXT;

-- Discovery preferences. Phone discovery defaults on (this is what Facebook,
-- Telegram and Snapchat do, and the feature is inert otherwise); location
-- discovery defaults off, since it additionally needs a browser permission
-- grant and is the more sensitive of the two.
ALTER TABLE users ADD COLUMN discoverable_by_phone INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN discoverable_by_location INTEGER DEFAULT 0;

-- Coarse location only: a 4-character geohash cell is roughly 40km across,
-- which is enough for "near you" and not enough to place someone. Precise
-- coordinates are deliberately never stored.
ALTER TABLE users ADD COLUMN location_geohash TEXT;
ALTER TABLE users ADD COLUMN location_updated_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone
    ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_hash
    ON users(phone_hash) WHERE phone_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_location_geohash
    ON users(location_geohash) WHERE location_geohash IS NOT NULL;

-- One-time codes for phone login. Only a hash of the code is stored, and
-- attempts are counted so a 6-digit code cannot be brute-forced.
CREATE TABLE IF NOT EXISTS phone_verification_codes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    phone TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_phone_codes_phone ON phone_verification_codes(phone);

-- Contact matches: which of the contacts a user uploaded resolved to a real
-- account. Only the resulting edge is kept -- the uploaded address book itself
-- is matched in-request and discarded, never persisted.
CREATE TABLE IF NOT EXISTS contact_matches (
    user_id TEXT NOT NULL,
    matched_user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, matched_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- A dismissed suggestion should stay dismissed.
CREATE TABLE IF NOT EXISTS suggestion_dismissals (
    user_id TEXT NOT NULL,
    suggested_user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, suggested_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (suggested_user_id) REFERENCES users(id) ON DELETE CASCADE
);
