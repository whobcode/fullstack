-- Gamer profile: store the AI-generated "shade" avatar so it persists and can
-- be shown across the game (dashboard, gamer profile) instead of only living in
-- transient client state.

ALTER TABLE users ADD COLUMN shade_avatar_url TEXT;
