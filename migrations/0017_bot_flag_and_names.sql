-- Mark bot accounts with a stable flag (so renaming their usernames doesn't
-- break the bot loop), then give each bot a consistent public name: set its
-- account username to its character's gamertag (e.g. "Wisp_275" instead of the
-- internal "bot_275"). Gamertags are already unique, so usernames stay unique.

ALTER TABLE users ADD COLUMN is_bot INTEGER DEFAULT 0;

UPDATE users SET is_bot = 1
  WHERE username LIKE 'bot\_%' ESCAPE '\' OR email LIKE '%@bots.shade';

UPDATE users SET username = (
    SELECT c.gamertag FROM characters c
    WHERE c.user_id = users.id AND c.gamertag IS NOT NULL
    ORDER BY c.slot_number LIMIT 1
  )
  WHERE is_bot = 1
    AND EXISTS (SELECT 1 FROM characters c WHERE c.user_id = users.id AND c.gamertag IS NOT NULL);
