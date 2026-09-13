-- 0029: name the character's avatar column for what it is.
--
-- Characters borrowed the `shade_avatar_url` name from users, but the two are
-- different pictures: the shade avatar is the account's shadowy persona, while
-- a character's avatar is that character's class creature -- a phoenix, a
-- dragon, a spirit. Sharing a name made it easy to generate one and overwrite
-- the other, which is exactly what happened.

ALTER TABLE characters RENAME COLUMN shade_avatar_url TO avatar_url;
