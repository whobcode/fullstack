-- D1 Social Platform Tables

-- Users table: Stores core user account information
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth accounts table: Links OAuth providers to user accounts
CREATE TABLE oauth_accounts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- e.g., 'google', 'discord'
    provider_account_id TEXT NOT NULL,
    access_token_hash TEXT,
    refresh_token_hash TEXT,
    expires_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (provider, provider_account_id)
);

-- Sessions table: Manages user login sessions
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Friends table: Manages friendship connections
CREATE TABLE friends (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    requester_id TEXT NOT NULL,
    addressee_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (requester_id, addressee_id)
);
CREATE INDEX idx_friends_requester ON friends(requester_id);
CREATE INDEX idx_friends_addressee ON friends(addressee_id);

-- Messages table: Stores direct messages between users
CREATE TABLE messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id);

-- Posts table: Stores user-created posts
CREATE TABLE posts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    author_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_posts_author ON posts(author_id);

-- Groups table: Stores information about user groups
CREATE TABLE groups (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    owner_id TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Group members table: Manages user membership in groups
CREATE TABLE group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'member')) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table: Stores in-app notifications for users
CREATE TABLE notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'friend_request', 'new_message', 'group_invite'
    payload_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user ON notifications(user_id);


-- D1 Game Section Tables

-- Characters table: Stores RPG character data, linked to a user
CREATE TABLE characters (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL UNIQUE,
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_characters_gamertag ON characters(gamertag);

-- Trophies table: Stores battle statistics for each character
CREATE TABLE trophies (
    character_id TEXT PRIMARY KEY,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Battles table: Records metadata for each battle instance
CREATE TABLE battles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    attacker_char_id TEXT NOT NULL,
    defender_char_id TEXT NOT NULL,
    mode TEXT CHECK(mode IN ('realtime', 'async')) NOT NULL,
    state TEXT CHECK(state IN ('pending', 'active', 'completed', 'canceled')) NOT NULL,
    seed TEXT NOT NULL,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    winner_char_id TEXT,
    FOREIGN KEY (attacker_char_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (defender_char_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_char_id) REFERENCES characters(id) ON DELETE SET NULL
);
CREATE INDEX idx_battles_attacker ON battles(attacker_char_id);
CREATE INDEX idx_battles_defender ON battles(defender_char_id);


-- Battle turns table: Logs every action taken in a battle
CREATE TABLE battle_turns (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    battle_id TEXT NOT NULL,
    turn_index INTEGER NOT NULL,
    actor_char_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- e.g., 'attack', 'skill', 'defend'
    damage INTEGER,
    hp_after_actor INTEGER,
    hp_after_target INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_char_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE (battle_id, turn_index)
);

-- Offline XP ledger: Prevents double-counting of time-based XP accrual
CREATE TABLE offline_xp_ledger (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    from_ts TIMESTAMP NOT NULL,
    to_ts TIMESTAMP NOT NULL,
    xp_awarded INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX idx_offline_xp_ledger_character ON offline_xp_ledger(character_id);

-- Leaderboard snapshots table: Stores metadata for historical leaderboards
CREATE TABLE leaderboard_snapshots (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    period TEXT CHECK(period IN ('daily', 'weekly', 'alltime')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard entries table: Stores the ranked entries for each snapshot
CREATE TABLE leaderboard_entries (
    snapshot_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    rank INTEGER NOT NULL,
    metric TEXT NOT NULL, -- e.g., 'wins', 'kills', 'level'
    value INTEGER NOT NULL,
    PRIMARY KEY (snapshot_id, metric, rank),
    FOREIGN KEY (snapshot_id) REFERENCES leaderboard_snapshots(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
