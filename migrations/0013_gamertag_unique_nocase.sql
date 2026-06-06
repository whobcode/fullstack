-- Enforce case-insensitive uniqueness of character gamertags (the public-facing
-- username). The column was already UNIQUE but case-sensitively, so "truest"
-- and "Truest" could both exist. NULLs (characters that haven't picked a name
-- yet) remain allowed and don't collide.

CREATE UNIQUE INDEX IF NOT EXISTS idx_characters_gamertag_nocase
  ON characters (gamertag COLLATE NOCASE);
