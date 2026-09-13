-- 0025: ability focuses (attack / defense / health), a 12-ability cap, and
-- sell-back.
--
-- The shop favoured attack: of the 12 equipment abilities, most read as
-- offence. Each is now a family of three -- an attack, a defence and a health
-- variant sharing a cost and level requirement -- so choosing a focus is the
-- decision rather than just buying everything. 12 families x 3 = 36 rows.
--
-- A character may own at most 12 DISTINCT equipment abilities (a third of the
-- 36), so they cannot hold every focus of every family. Utility abilities such
-- as the Stamina Stone are exempt and are shared across a player's characters.

-- What the ability boosts, and which family it belongs to.
ALTER TABLE abilities ADD COLUMN focus TEXT NOT NULL DEFAULT 'atk';
ALTER TABLE abilities ADD COLUMN family TEXT;

-- Health and speed contributions. hp_value is a flat addition to the health
-- pool; hp_pct is a percentage of it, used by the three endgame health
-- abilities so they keep scaling instead of going stale at high level.
ALTER TABLE abilities ADD COLUMN hp_value INTEGER NOT NULL DEFAULT 0;
ALTER TABLE abilities ADD COLUMN hp_pct INTEGER NOT NULL DEFAULT 0;
ALTER TABLE abilities ADD COLUMN spd_value INTEGER NOT NULL DEFAULT 0;

-- What a sale returns, as a percentage of the purchase price.
ALTER TABLE abilities ADD COLUMN sellback_pct INTEGER NOT NULL DEFAULT 45;

-- Retune the 12 rows that already exist, in place. They are owned by real
-- characters (15 rows / 136 copies in production), and character_abilities
-- cascades on delete, so replacing them wholesale would confiscate every
-- purchase. Updating by name keeps the ids and therefore the ownership.
UPDATE abilities SET category='physical', focus='atk', family='strike', attack_value=12, defense_value=3, hp_value=0, hp_pct=0, spd_value=3, cost=0, level_requirement=1, description='Attack-focused. +12 attack, +3 defense, +3 speed.' WHERE name='Basic Strike' AND kind='equipment';
UPDATE abilities SET category='physical', focus='atk', family='slash', attack_value=28, defense_value=7, hp_value=0, hp_pct=0, spd_value=0, cost=500, level_requirement=3, description='Attack-focused. +28 attack, +7 defense.' WHERE name='Power Slash' AND kind='equipment';
UPDATE abilities SET category='physical', focus='atk', family='blow', attack_value=52, defense_value=13, hp_value=0, hp_pct=0, spd_value=13, cost=2000, level_requirement=7, description='Attack-focused. +52 attack, +13 defense, +13 speed.' WHERE name='Titan Blow' AND kind='equipment';
UPDATE abilities SET category='physical', focus='atk', family='assault', attack_value=100, defense_value=25, hp_value=0, hp_pct=0, spd_value=0, cost=10000, level_requirement=15, description='Attack-focused. +100 attack, +25 defense.' WHERE name='Legendary Assault' AND kind='equipment';
UPDATE abilities SET category='sensory', focus='def', family='senses', attack_value=4, defense_value=16, hp_value=0, hp_pct=0, spd_value=0, cost=0, level_requirement=1, description='Defense-focused. +16 defense, +4 attack.' WHERE name='Keen Senses' AND kind='equipment';
UPDATE abilities SET category='sensory', focus='def', family='mind', attack_value=9, defense_value=36, hp_value=0, hp_pct=0, spd_value=9, cost=500, level_requirement=3, description='Defense-focused. +36 defense, +9 attack, +9 speed.' WHERE name='Mind Shield' AND kind='equipment';
UPDATE abilities SET category='sensory', focus='def', family='sixth', attack_value=18, defense_value=72, hp_value=0, hp_pct=0, spd_value=0, cost=2000, level_requirement=7, description='Defense-focused. +72 defense, +18 attack.' WHERE name='Sixth Sense' AND kind='equipment';
UPDATE abilities SET category='sensory', focus='def', family='omni', attack_value=36, defense_value=144, hp_value=0, hp_pct=0, spd_value=36, cost=10000, level_requirement=15, description='Defense-focused. +144 defense, +36 attack, +36 speed.' WHERE name='Omniscience' AND kind='equipment';
UPDATE abilities SET category='transformation', focus='atk', family='minor', attack_value=16, defense_value=4, hp_value=0, hp_pct=0, spd_value=4, cost=0, level_requirement=1, description='Attack-focused. +16 attack, +4 defense, +4 speed.' WHERE name='Minor Form' AND kind='equipment';
UPDATE abilities SET category='transformation', focus='atk', family='battle', attack_value=40, defense_value=10, hp_value=0, hp_pct=0, spd_value=0, cost=500, level_requirement=3, description='Attack-focused. +40 attack, +10 defense.' WHERE name='Battle Form' AND kind='equipment';
UPDATE abilities SET category='transformation', focus='atk', family='war', attack_value=80, defense_value=20, hp_value=0, hp_pct=0, spd_value=20, cost=2000, level_requirement=7, description='Attack-focused. +80 attack, +20 defense, +20 speed.' WHERE name='War Form' AND kind='equipment';
UPDATE abilities SET category='transformation', focus='atk', family='apex', attack_value=160, defense_value=40, hp_value=0, hp_pct=0, spd_value=0, cost=10000, level_requirement=15, description='Attack-focused. +160 attack, +40 defense.' WHERE name='Apex Form' AND kind='equipment';

-- The 24 new focus variants.
INSERT INTO abilities (name, category, kind, focus, family, attack_value, defense_value, hp_value, hp_pct, spd_value, cost, level_requirement, max_quantity, level_step, description) VALUES
    ('Basic Guard', 'physical', 'equipment', 'def', 'strike', 3, 12, 0, 0, 0, 0, 1, 10, 0, 'Defense-focused. +12 defense, +3 attack.'),
    ('Basic Heart', 'physical', 'equipment', 'hp', 'strike', 2, 2, 1500, 0, 0, 0, 1, 10, 0, 'Health-focused. +1,500 max health, +2 attack and defense.'),
    ('Power Parry', 'physical', 'equipment', 'def', 'slash', 7, 28, 0, 0, 7, 500, 3, 10, 0, 'Defense-focused. +28 defense, +7 attack, +7 speed.'),
    ('Power Heart', 'physical', 'equipment', 'hp', 'slash', 4, 4, 3500, 0, 0, 500, 3, 10, 0, 'Health-focused. +3,500 max health, +4 attack and defense.'),
    ('Titan Bulwark', 'physical', 'equipment', 'def', 'blow', 13, 52, 0, 0, 0, 2000, 7, 10, 0, 'Defense-focused. +52 defense, +13 attack.'),
    ('Titan Heart', 'physical', 'equipment', 'hp', 'blow', 6, 6, 6500, 0, 0, 2000, 7, 10, 0, 'Health-focused. +6,500 max health, +6 attack and defense.'),
    ('Legendary Aegis', 'physical', 'equipment', 'def', 'assault', 25, 100, 0, 0, 25, 10000, 15, 10, 0, 'Defense-focused. +100 defense, +25 attack, +25 speed.'),
    ('Legendary Heart', 'physical', 'equipment', 'hp', 'assault', 12, 12, 0, 5, 25, 10000, 15, 10, 0, 'Health-focused. +5% max health, +25 speed, +12 attack and defense.'),
    ('Keen Edge', 'sensory', 'equipment', 'atk', 'senses', 16, 4, 0, 0, 4, 0, 1, 10, 0, 'Attack-focused. +16 attack, +4 defense, +4 speed.'),
    ('Keen Vitality', 'sensory', 'equipment', 'hp', 'senses', 2, 2, 2000, 0, 0, 0, 1, 10, 0, 'Health-focused. +2,000 max health, +2 attack and defense.'),
    ('Mind Spike', 'sensory', 'equipment', 'atk', 'mind', 36, 9, 0, 0, 0, 500, 3, 10, 0, 'Attack-focused. +36 attack, +9 defense.'),
    ('Mind Reservoir', 'sensory', 'equipment', 'hp', 'mind', 4, 4, 4500, 0, 0, 500, 3, 10, 0, 'Health-focused. +4,500 max health, +4 attack and defense.'),
    ('Sixth Strike', 'sensory', 'equipment', 'atk', 'sixth', 72, 18, 0, 0, 18, 2000, 7, 10, 0, 'Attack-focused. +72 attack, +18 defense, +18 speed.'),
    ('Sixth Wellspring', 'sensory', 'equipment', 'hp', 'sixth', 9, 9, 9000, 0, 0, 2000, 7, 10, 0, 'Health-focused. +9,000 max health, +9 attack and defense.'),
    ('Omniscient Edge', 'sensory', 'equipment', 'atk', 'omni', 144, 36, 0, 0, 0, 10000, 15, 10, 0, 'Attack-focused. +144 attack, +36 defense.'),
    ('Omniscient Vitality', 'sensory', 'equipment', 'hp', 'omni', 18, 18, 0, 5, 36, 10000, 15, 10, 0, 'Health-focused. +5% max health, +36 speed, +18 attack and defense.'),
    ('Minor Carapace', 'transformation', 'equipment', 'def', 'minor', 4, 16, 0, 0, 0, 0, 1, 10, 0, 'Defense-focused. +16 defense, +4 attack.'),
    ('Minor Vigor', 'transformation', 'equipment', 'hp', 'minor', 2, 2, 2000, 0, 0, 0, 1, 10, 0, 'Health-focused. +2,000 max health, +2 attack and defense.'),
    ('Battle Carapace', 'transformation', 'equipment', 'def', 'battle', 10, 40, 0, 0, 10, 500, 3, 10, 0, 'Defense-focused. +40 defense, +10 attack, +10 speed.'),
    ('Battle Vigor', 'transformation', 'equipment', 'hp', 'battle', 5, 5, 5000, 0, 0, 500, 3, 10, 0, 'Health-focused. +5,000 max health, +5 attack and defense.'),
    ('War Carapace', 'transformation', 'equipment', 'def', 'war', 20, 80, 0, 0, 0, 2000, 7, 10, 0, 'Defense-focused. +80 defense, +20 attack.'),
    ('War Vigor', 'transformation', 'equipment', 'hp', 'war', 10, 10, 10000, 0, 0, 2000, 7, 10, 0, 'Health-focused. +10,000 max health, +10 attack and defense.'),
    ('Apex Carapace', 'transformation', 'equipment', 'def', 'apex', 40, 160, 0, 0, 40, 10000, 15, 10, 0, 'Defense-focused. +160 defense, +40 attack, +40 speed.'),
    ('Apex Vigor', 'transformation', 'equipment', 'hp', 'apex', 20, 20, 0, 10, 40, 10000, 15, 10, 0, 'Health-focused. +10% max health, +40 speed, +20 attack and defense.');

-- ---------------------------------------------------------------------------
-- The 12-ability cap
--
-- Enforced in the database rather than only in the purchase handler: the
-- handler's count-then-insert races, and a batch that oversteps should abort
-- rather than commit. Utility abilities are excluded from the count.
-- ---------------------------------------------------------------------------
CREATE TRIGGER character_abilities_distinct_cap
BEFORE INSERT ON character_abilities
WHEN (SELECT kind FROM abilities WHERE id = NEW.ability_id) = 'equipment'
 AND (
   SELECT COUNT(*) FROM character_abilities ca
   JOIN abilities a ON a.id = ca.ability_id
   WHERE ca.character_id = NEW.character_id AND a.kind = 'equipment'
 ) >= 12
BEGIN
    SELECT RAISE(ABORT, 'ability slot limit reached');
END;
