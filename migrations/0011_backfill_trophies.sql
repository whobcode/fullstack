-- Ensure every character has a trophies row.
--
-- Some characters (e.g. the founder's slot-1 character) were created without a
-- trophies row. Battle code updates trophies with `UPDATE ... WHERE
-- character_id = ?`, which silently affected zero rows for those characters —
-- so their wins/losses/kills/deaths never changed. Backfill the missing rows;
-- going forward the battle code upserts, so this can't recur.

INSERT OR IGNORE INTO trophies (character_id) SELECT id FROM characters;
