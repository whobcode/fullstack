-- Facebook profile data mirroring

-- Add Facebook-specific profile fields to users table
ALTER TABLE users ADD COLUMN cover_photo_url TEXT;
ALTER TABLE users ADD COLUMN fb_about TEXT;
ALTER TABLE users ADD COLUMN fb_location TEXT;
ALTER TABLE users ADD COLUMN fb_data_synced_at TIMESTAMP;

-- Add scope and raw profile data to oauth_accounts for storing FB permissions
ALTER TABLE oauth_accounts ADD COLUMN scope TEXT;
ALTER TABLE oauth_accounts ADD COLUMN raw_profile_json TEXT;

-- Table for storing mirrored Facebook photos
CREATE TABLE fb_photos (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    fb_photo_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    created_time TIMESTAMP,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, fb_photo_id)
);
CREATE INDEX idx_fb_photos_user ON fb_photos(user_id);

-- Table for storing mirrored Facebook friends (those also on 'me' platform)
CREATE TABLE fb_friend_connections (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    fb_friend_id TEXT NOT NULL,
    fb_friend_name TEXT,
    matched_user_id TEXT, -- if this FB friend is also a user on 'me'
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (user_id, fb_friend_id)
);
CREATE INDEX idx_fb_friends_user ON fb_friend_connections(user_id);
CREATE INDEX idx_fb_friends_matched ON fb_friend_connections(matched_user_id);
