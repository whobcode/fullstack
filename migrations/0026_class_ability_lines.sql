-- 0026: name the ability lines after the character classes.
--
-- Phoenix is the attack line, Dragon the defence line, Kies the health line,
-- with Dark Phoenix and Dark Dragon taking the two upper tiers of attack and
-- defence so all five classes are represented.
--
-- Renamed in place, keyed on (family, focus). These rows are owned by real
-- characters and character_abilities cascades on delete, so replacing them
-- would confiscate purchases; updating keeps the ids and the ownership.
-- Values and costs are unchanged — this is naming and flavour only.

UPDATE abilities SET name='Phoenix Strike', description='Phoenix line — attack. +12 attack, +3 defense, +3 speed.' WHERE family='strike' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dragon Guard', description='Dragon line — defense. +12 defense, +3 attack.' WHERE family='strike' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Heart', description='Kies line — health. +1,500 max health, +2 attack and defense.' WHERE family='strike' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Phoenix Slash', description='Phoenix line — attack. +28 attack, +7 defense.' WHERE family='slash' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dragon Parry', description='Dragon line — defense. +28 defense, +7 attack, +7 speed.' WHERE family='slash' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Pulse', description='Kies line — health. +3,500 max health, +4 attack and defense.' WHERE family='slash' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Dark Phoenix Talon', description='Phoenix line — attack. +52 attack, +13 defense, +13 speed.' WHERE family='blow' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dark Dragon Bulwark', description='Dragon line — defense. +52 defense, +13 attack.' WHERE family='blow' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Core', description='Kies line — health. +6,500 max health, +6 attack and defense.' WHERE family='blow' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Dark Phoenix Assault', description='Phoenix line — attack. +100 attack, +25 defense.' WHERE family='assault' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dark Dragon Aegis', description='Dragon line — defense. +100 defense, +25 attack, +25 speed.' WHERE family='assault' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Bastion', description='Kies line — health. +5% max health, +25 speed, +12 attack and defense.' WHERE family='assault' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Phoenix Sight', description='Phoenix line — attack. +16 attack, +4 defense, +4 speed.' WHERE family='senses' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dragon Ward', description='Dragon line — defense. +16 defense, +4 attack.' WHERE family='senses' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Vitality', description='Kies line — health. +2,000 max health, +2 attack and defense.' WHERE family='senses' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Phoenix Spike', description='Phoenix line — attack. +36 attack, +9 defense.' WHERE family='mind' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dragon Shield', description='Dragon line — defense. +36 defense, +9 attack, +9 speed.' WHERE family='mind' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Reservoir', description='Kies line — health. +4,500 max health, +4 attack and defense.' WHERE family='mind' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Dark Phoenix Insight', description='Phoenix line — attack. +72 attack, +18 defense, +18 speed.' WHERE family='sixth' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dark Dragon Vigil', description='Dragon line — defense. +72 defense, +18 attack.' WHERE family='sixth' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Wellspring', description='Kies line — health. +9,000 max health, +9 attack and defense.' WHERE family='sixth' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Dark Phoenix Omniscience', description='Phoenix line — attack. +144 attack, +36 defense.' WHERE family='omni' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dark Dragon Sentinel', description='Dragon line — defense. +144 defense, +36 attack, +36 speed.' WHERE family='omni' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Infinity', description='Kies line — health. +5% max health, +36 speed, +18 attack and defense.' WHERE family='omni' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Phoenix Form', description='Phoenix line — attack. +16 attack, +4 defense, +4 speed.' WHERE family='minor' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dragon Carapace', description='Dragon line — defense. +16 defense, +4 attack.' WHERE family='minor' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Vigor', description='Kies line — health. +2,000 max health, +2 attack and defense.' WHERE family='minor' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Phoenix Ascension', description='Phoenix line — attack. +40 attack, +10 defense.' WHERE family='battle' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dragon Scale', description='Dragon line — defense. +40 defense, +10 attack, +10 speed.' WHERE family='battle' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Bloom', description='Kies line — health. +5,000 max health, +5 attack and defense.' WHERE family='battle' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Dark Phoenix Rebirth', description='Phoenix line — attack. +80 attack, +20 defense, +20 speed.' WHERE family='war' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dark Dragon Hide', description='Dragon line — defense. +80 defense, +20 attack.' WHERE family='war' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Surge', description='Kies line — health. +10,000 max health, +10 attack and defense.' WHERE family='war' AND focus='hp' AND kind='equipment';
UPDATE abilities SET name='Dark Phoenix Apex', description='Phoenix line — attack. +160 attack, +40 defense.' WHERE family='apex' AND focus='atk' AND kind='equipment';
UPDATE abilities SET name='Dark Dragon Titan', description='Dragon line — defense. +160 defense, +40 attack, +40 speed.' WHERE family='apex' AND focus='def' AND kind='equipment';
UPDATE abilities SET name='Kies Eternal', description='Kies line — health. +10% max health, +40 speed, +20 attack and defense.' WHERE family='apex' AND focus='hp' AND kind='equipment';
