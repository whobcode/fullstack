-- 0028: let a character at 12 abilities keep stacking the ones they own.
--
-- The slot cap is on DISTINCT abilities, but the trigger blocked any insert
-- once 12 were held, including the upsert that buys another copy of one you
-- already have. SQLite fires BEFORE INSERT triggers before conflict
-- resolution, so `INSERT ... ON CONFLICT DO UPDATE SET quantity = quantity + 1`
-- still ran the trigger even though it only increments an existing row and
-- adds no new ability. A character with 12 abilities could therefore never
-- max any of them out.
--
-- The guard now fires only when the ability is not already owned, which is the
-- case that would actually add a 13th. The 10-copy stack cap is unaffected --
-- it lives on the UPDATE path and still applies.

DROP TRIGGER IF EXISTS character_abilities_distinct_cap;

CREATE TRIGGER character_abilities_distinct_cap
BEFORE INSERT ON character_abilities
WHEN (SELECT kind FROM abilities WHERE id = NEW.ability_id) = 'equipment'
 AND NOT EXISTS (
   SELECT 1 FROM character_abilities
   WHERE character_id = NEW.character_id AND ability_id = NEW.ability_id
 )
 AND (
   SELECT COUNT(*) FROM character_abilities ca
   JOIN abilities a ON a.id = ca.ability_id
   WHERE ca.character_id = NEW.character_id AND a.kind = 'equipment'
 ) >= 12
BEGIN
    SELECT RAISE(ABORT, 'ability slot limit reached');
END;
