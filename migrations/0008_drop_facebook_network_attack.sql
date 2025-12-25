-- Drop unused Facebook and network attack tables/columns
-- These features were removed as Facebook deprecated user search API in 2019

-- Drop Facebook-specific columns from users table
-- (keeping cover_photo_url as it's still useful for user profiles)
ALTER TABLE users DROP COLUMN fb_about;
ALTER TABLE users DROP COLUMN fb_location;
ALTER TABLE users DROP COLUMN fb_data_synced_at;

-- Drop Facebook photos table
DROP TABLE IF EXISTS fb_photos;

-- Drop Facebook friend connections table
DROP TABLE IF EXISTS fb_friend_connections;

-- Drop network attack invites table
DROP TABLE IF EXISTS network_attack_invites;

-- Drop invite-related columns from characters table
ALTER TABLE characters DROP COLUMN invite_token_used;
ALTER TABLE characters DROP COLUMN invite_network;
ALTER TABLE characters DROP COLUMN invite_attacker_char_id;
ALTER TABLE characters DROP COLUMN invite_level_snapshot;
