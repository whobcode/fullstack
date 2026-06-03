-- Cross-platform sync: link external social accounts and import their content into fullstack.

CREATE TABLE IF NOT EXISTS social_connections (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,            -- mastodon | rss | bluesky | twitter | facebook | instagram | custom
    handle TEXT,                       -- @user@instance, feed URL, profile URL, etc.
    external_account_id TEXT,
    access_token TEXT,                 -- optional; set via secret-backed flows, not required for public sources
    status TEXT NOT NULL DEFAULT 'active', -- active | error | revoked
    last_synced_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, provider, handle)
);
CREATE INDEX IF NOT EXISTS idx_social_connections_user ON social_connections(user_id);

CREATE TABLE IF NOT EXISTS imported_posts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    connection_id TEXT,
    provider TEXT NOT NULL,
    external_id TEXT NOT NULL,         -- id of the post on the source platform
    author_handle TEXT,
    body TEXT,
    url TEXT,
    posted_at TIMESTAMP,
    raw_json TEXT,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES social_connections(id) ON DELETE CASCADE,
    UNIQUE (provider, external_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_imported_posts_user ON imported_posts(user_id, posted_at);
