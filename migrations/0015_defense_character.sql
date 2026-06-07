-- The character that defends when this user is attacked. If set, any attack
-- aimed at one of the user's characters is challenged against this one instead.
ALTER TABLE users ADD COLUMN defense_character_id TEXT;
