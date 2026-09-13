-- 0023: ability stacking cap, utility abilities (Stamina Stone), and the end
-- of the trubone special account.

-- ---------------------------------------------------------------------------
-- Special account
--
-- trubone was granted all 7 slots and max-level characters on signup. The flag
-- row goes; SPECIAL_USERNAMES is emptied in workers/src/api/auth.ts so it is
-- not re-granted on the next login. Characters that already exist keep their
-- levels -- this only stops the privilege, it does not roll anything back.
-- ---------------------------------------------------------------------------
DELETE FROM special_accounts
WHERE user_id IN (SELECT id FROM users WHERE username = 'trubone' COLLATE NOCASE);

-- ---------------------------------------------------------------------------
-- Abilities gain a kind, stacking limits, and non-combat effects
-- ---------------------------------------------------------------------------

-- 'equipment' feeds the battle maths (best attack/defense per category, times
-- clan size). 'utility' never does -- it is bought for its own effect. Keeping
-- them apart by kind rather than by category avoids rebuilding the abilities
-- table, whose category CHECK cannot be widened in place, and whose child rows
-- in character_abilities cascade on DROP.
ALTER TABLE abilities ADD COLUMN kind TEXT NOT NULL DEFAULT 'equipment';

-- How many copies of one ability a character may stack.
ALTER TABLE abilities ADD COLUMN max_quantity INTEGER NOT NULL DEFAULT 10;

-- Extra levels required per copy already owned, so repeat purchases space out.
ALTER TABLE abilities ADD COLUMN level_step INTEGER NOT NULL DEFAULT 0;

-- Utility effects, applied per copy owned.
ALTER TABLE abilities ADD COLUMN stamina_bonus INTEGER NOT NULL DEFAULT 0;
ALTER TABLE abilities ADD COLUMN stamina_regen_pct INTEGER NOT NULL DEFAULT 0;

-- Nothing should already exceed the cap, but clamp rather than leave a row
-- that the trigger below would then refuse to update.
UPDATE character_abilities SET quantity = 10 WHERE quantity > 10;

-- Enforce the cap in the database, not just in the purchase handler: the
-- handler's read-then-write has a race, and a batch that oversteps should not
-- commit at all.
CREATE TRIGGER character_abilities_stack_cap_insert
BEFORE INSERT ON character_abilities
WHEN NEW.quantity > (SELECT max_quantity FROM abilities WHERE id = NEW.ability_id)
BEGIN
    SELECT RAISE(ABORT, 'ability stack limit reached');
END;

CREATE TRIGGER character_abilities_stack_cap_update
BEFORE UPDATE OF quantity ON character_abilities
WHEN NEW.quantity > (SELECT max_quantity FROM abilities WHERE id = NEW.ability_id)
BEGIN
    SELECT RAISE(ABORT, 'ability stack limit reached');
END;

-- ---------------------------------------------------------------------------
-- Stamina Stone
--
-- +5 max stamina and +5% stamina regeneration per copy, 10 million each,
-- capped at 10 copies. level_step 5 means each copy needs 5 more levels than
-- the last, so the unlock schedule runs 25, 30, 35 ... 70 for the tenth and
-- final copy.
-- ---------------------------------------------------------------------------
INSERT INTO abilities
    (name, category, kind, attack_value, defense_value, cost, level_requirement,
     max_quantity, level_step, stamina_bonus, stamina_regen_pct, description)
VALUES
    ('Stamina Stone', 'transformation', 'utility', 0, 0, 10000000, 25,
     10, 5, 5, 5,
     '+5 max stamina and +5% stamina regeneration per stone. Each stone needs 5 more levels than the last (25, 30, 35 ... 70). Ten stones give +50 stamina and +50% regeneration.');
