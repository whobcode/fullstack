-- 0027: avatars belong to a character, not to the account.
--
-- shade_avatar_url lived on users, so a player with several characters had one
-- shared avatar: generating a new one while playing as a second character
-- replaced the first character's, which reads as "the avatar didn't save".
-- The column on users stays as the fallback for characters that have not
-- generated one yet.

ALTER TABLE characters ADD COLUMN shade_avatar_url TEXT;

-- Seed each player's existing avatar onto their active character (or their
-- first slot), so nobody loses the one they already generated.
UPDATE characters
SET shade_avatar_url = (SELECT u.shade_avatar_url FROM users u WHERE u.id = characters.user_id)
WHERE shade_avatar_url IS NULL
  AND id IN (
    SELECT COALESCE(
      (SELECT u.active_character_id FROM users u WHERE u.id = characters.user_id),
      (SELECT c2.id FROM characters c2 WHERE c2.user_id = characters.user_id ORDER BY c2.slot_number LIMIT 1)
    )
  );
