-- 0031: bots for levels 276-299.
--
-- Twenty-four accounts continuing the existing bot ladder, which topped out at
-- 275. Each maxes the twelve abilities of the line matching its class -- the
-- Phoenix line for attack classes, Dragon for defence, Kies for health -- at
-- ten copies each, which is exactly the 12-ability slot cap.
--
-- Stat points were placed by running the battle formula itself
-- (scratchpad/optimize_bots.py mirrors storm8-battle-engine.ts) and searching
-- allocations against a panel of the thirteen strongest existing characters,
-- scoring each candidate attacking AND defending.
--
-- The unconstrained optimum was 100% speed for every class: ability attack is
-- already lethal against everything in the panel, so the only thing points can
-- still buy is striking first, and speed grants both initiative and up to five
-- hits. That would have made all 24 bots identical, so 60% is reserved for the
-- class's own stat (following truest: phoenix/attack, and Caspian:
-- dragon/defence) and the algorithm places the remainder -- which it spends on
-- speed. Resulting scores range 22-26 of 26, so the ladder is not uniform.
--
-- is_bot = 1 and username = gamertag, matching 0017: bots are not labelled as
-- bots publicly.


-- Mourn_276 (phoenix, level 276) -- 0 HP / 990 ATK / 0 DEF / 660 SPD, scored 22/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-276-user', 'bot276@bots.shade', 'Mourn_276', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-276-char', 'bot-276-user', 1, 'Mourn_276', 'phoenix', 276, 155429252691,
    10000, 100000, 500, 175, 1420, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-276-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-276-user', 0);

-- The twelve atk-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-276-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'atk';

-- Rictus_277 (dphoenix, level 277) -- 0 HP / 993 ATK / 0 DEF / 662 SPD, scored 22/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-277-user', 'bot277@bots.shade', 'Rictus_277', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-277-char', 'bot-277-user', 1, 'Rictus_277', 'dphoenix', 277, 167863592906,
    10000, 175525, 375, 150, 1474, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-277-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-277-user', 0);

-- The twelve atk-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-277-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'atk';

-- Gloam_278 (dragon, level 278) -- 0 HP / 0 ATK / 996 DEF / 664 SPD, scored 26/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-278-user', 'bot278@bots.shade', 'Gloam_278', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-278-char', 'bot-278-user', 1, 'Gloam_278', 'dragon', 278, 181292680339,
    10000, 750, 110660, 100, 1503, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-278-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-278-user', 0);

-- The twelve def-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-278-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'def';

-- Scour_279 (ddragon, level 279) -- 0 HP / 0 ATK / 999 DEF / 666 SPD, scored 26/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-279-user', 'bot279@bots.shade', 'Scour_279', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-279-char', 'bot-279-user', 1, 'Scour_279', 'ddragon', 279, 195796094766,
    10000, 1000, 100900, 200, 1407, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-279-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-279-user', 0);

-- The twelve def-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-279-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'def';

-- Blight_280 (kies, level 280) -- 1006 HP / 83 ATK / 0 DEF / 586 SPD, scored 24/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-280-user', 'bot280@bots.shade', 'Blight_280', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-280-char', 'bot-280-user', 1, 'Blight_280', 'kies', 280, 211459782347,
    1666800, 6975, 750, 225, 1322, 0, 1,
    1666800, 1666800, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-280-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-280-user', 0);

-- The twelve hp-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-280-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'hp';

-- Harrow_281 (phoenix, level 281) -- 0 HP / 1008 ATK / 0 DEF / 672 SPD, scored 22/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-281-user', 'bot281@bots.shade', 'Harrow_281', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-281-char', 'bot-281-user', 1, 'Harrow_281', 'phoenix', 281, 228376564935,
    10000, 101800, 500, 175, 1444, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-281-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-281-user', 0);

-- The twelve atk-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-281-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'atk';

-- Wraith_282 (dphoenix, level 282) -- 0 HP / 1011 ATK / 0 DEF / 674 SPD, scored 22/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-282-user', 'bot282@bots.shade', 'Wraith_282', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-282-char', 'bot-282-user', 1, 'Wraith_282', 'dphoenix', 282, 246646690130,
    10000, 178675, 375, 150, 1498, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-282-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-282-user', 0);

-- The twelve atk-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-282-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'atk';

-- Ossuary_283 (dragon, level 283) -- 0 HP / 0 ATK / 1014 DEF / 676 SPD, scored 26/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-283-user', 'bot283@bots.shade', 'Ossuary_283', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-283-char', 'bot-283-user', 1, 'Ossuary_283', 'dragon', 283, 266378425341,
    10000, 750, 112640, 100, 1527, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-283-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-283-user', 0);

-- The twelve def-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-283-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'def';

-- Cairn_284 (ddragon, level 284) -- 0 HP / 0 ATK / 1017 DEF / 678 SPD, scored 26/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-284-user', 'bot284@bots.shade', 'Cairn_284', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-284-char', 'bot-284-user', 1, 'Cairn_284', 'ddragon', 284, 287688699368,
    10000, 1000, 102700, 200, 1431, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-284-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-284-user', 0);

-- The twelve def-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-284-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'def';

-- Dirge_285 (kies, level 285) -- 1024 HP / 85 ATK / 0 DEF / 596 SPD, scored 24/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-285-user', 'bot285@bots.shade', 'Dirge_285', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-285-char', 'bot-285-user', 1, 'Dirge_285', 'kies', 285, 310703795317,
    1672200, 7125, 750, 225, 1342, 0, 1,
    1672200, 1672200, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-285-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-285-user', 0);

-- The twelve hp-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-285-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'hp';

-- Ember_286 (phoenix, level 286) -- 0 HP / 1026 ATK / 0 DEF / 684 SPD, scored 22/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-286-user', 'bot286@bots.shade', 'Ember_286', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-286-char', 'bot-286-user', 1, 'Ember_286', 'phoenix', 286, 335560098943,
    10000, 103600, 500, 175, 1468, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-286-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-286-user', 0);

-- The twelve atk-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-286-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'atk';

-- Shroud_287 (dphoenix, level 287) -- 0 HP / 1029 ATK / 0 DEF / 686 SPD, scored 24/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-287-user', 'bot287@bots.shade', 'Shroud_287', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-287-char', 'bot-287-user', 1, 'Shroud_287', 'dphoenix', 287, 362404906858,
    10000, 181825, 375, 150, 1522, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-287-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-287-user', 0);

-- The twelve atk-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-287-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'atk';

-- Pyre_288 (dragon, level 288) -- 0 HP / 0 ATK / 1032 DEF / 688 SPD, scored 26/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-288-user', 'bot288@bots.shade', 'Pyre_288', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-288-char', 'bot-288-user', 1, 'Pyre_288', 'dragon', 288, 391397299407,
    10000, 750, 114620, 100, 1551, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-288-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-288-user', 0);

-- The twelve def-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-288-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'def';

-- Gallow_289 (ddragon, level 289) -- 0 HP / 0 ATK / 1035 DEF / 690 SPD, scored 26/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-289-user', 'bot289@bots.shade', 'Gallow_289', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-289-char', 'bot-289-user', 1, 'Gallow_289', 'ddragon', 289, 422709083360,
    10000, 1000, 104500, 200, 1455, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-289-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-289-user', 0);

-- The twelve def-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-289-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'def';

-- Revenant_290 (kies, level 290) -- 1042 HP / 86 ATK / 0 DEF / 607 SPD, scored 24/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-290-user', 'bot290@bots.shade', 'Revenant_290', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-290-char', 'bot-290-user', 1, 'Revenant_290', 'kies', 290, 456525810028,
    1677600, 7200, 750, 225, 1364, 0, 1,
    1677600, 1677600, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-290-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-290-user', 0);

-- The twelve hp-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-290-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'hp';

-- Tallow_291 (phoenix, level 291) -- 0 HP / 1044 ATK / 0 DEF / 696 SPD, scored 22/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-291-user', 'bot291@bots.shade', 'Tallow_291', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-291-char', 'bot-291-user', 1, 'Tallow_291', 'phoenix', 291, 493047874831,
    10000, 105400, 500, 175, 1492, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-291-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-291-user', 0);

-- The twelve atk-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-291-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'atk';

-- Marrow_292 (dphoenix, level 292) -- 0 HP / 1047 ATK / 0 DEF / 698 SPD, scored 24/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-292-user', 'bot292@bots.shade', 'Marrow_292', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-292-char', 'bot-292-user', 1, 'Marrow_292', 'dphoenix', 292, 532491704817,
    10000, 184975, 375, 150, 1546, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-292-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-292-user', 0);

-- The twelve atk-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-292-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'atk';

-- Sepulchre_293 (dragon, level 293) -- 0 HP / 0 ATK / 1050 DEF / 700 SPD, scored 26/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-293-user', 'bot293@bots.shade', 'Sepulchre_293', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-293-char', 'bot-293-user', 1, 'Sepulchre_293', 'dragon', 293, 575091041203,
    10000, 750, 116600, 100, 1575, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-293-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-293-user', 0);

-- The twelve def-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-293-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'def';

-- Cindra_294 (ddragon, level 294) -- 0 HP / 0 ATK / 1053 DEF / 702 SPD, scored 26/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-294-user', 'bot294@bots.shade', 'Cindra_294', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-294-char', 'bot-294-user', 1, 'Cindra_294', 'ddragon', 294, 621098324499,
    10000, 1000, 106300, 200, 1479, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-294-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-294-user', 0);

-- The twelve def-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-294-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'def';

-- Vesper_295 (kies, level 295) -- 1060 HP / 88 ATK / 0 DEF / 617 SPD, scored 24/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-295-user', 'bot295@bots.shade', 'Vesper_295', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-295-char', 'bot-295-user', 1, 'Vesper_295', 'kies', 295, 670786190459,
    1683000, 7350, 750, 225, 1384, 0, 1,
    1683000, 1683000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-295-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-295-user', 0);

-- The twelve hp-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-295-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'hp';

-- Nocturne_296 (phoenix, level 296) -- 0 HP / 1062 ATK / 0 DEF / 708 SPD, scored 24/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-296-user', 'bot296@bots.shade', 'Nocturne_296', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-296-char', 'bot-296-user', 1, 'Nocturne_296', 'phoenix', 296, 724449085696,
    10000, 107200, 500, 175, 1516, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-296-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-296-user', 0);

-- The twelve atk-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-296-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'atk';

-- Obelisk_297 (dphoenix, level 297) -- 0 HP / 1065 ATK / 0 DEF / 710 SPD, scored 24/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-297-user', 'bot297@bots.shade', 'Obelisk_297', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-297-char', 'bot-297-user', 1, 'Obelisk_297', 'dphoenix', 297, 782405012551,
    10000, 188125, 375, 150, 1570, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-297-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-297-user', 0);

-- The twelve atk-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-297-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'atk';

-- Requiem_298 (dragon, level 298) -- 0 HP / 0 ATK / 1068 DEF / 712 SPD, scored 26/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-298-user', 'bot298@bots.shade', 'Requiem_298', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-298-char', 'bot-298-user', 1, 'Requiem_298', 'dragon', 298, 844997413555,
    10000, 750, 118580, 100, 1599, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-298-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-298-user', 0);

-- The twelve def-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-298-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'def';

-- Erebus_299 (ddragon, level 299) -- 0 HP / 0 ATK / 1071 DEF / 714 SPD, scored 26/26
INSERT OR IGNORE INTO users (id, email, username, password_hash, is_bot)
VALUES ('bot-299-user', 'bot299@bots.shade', 'Erebus_299', NULL, 1);

INSERT OR IGNORE INTO characters (
    id, user_id, slot_number, gamertag, class, level, xp,
    hp, atk, def, mp, spd, unspent_stat_points, first_game_access_completed,
    current_health, max_health, current_energy, max_energy,
    current_stamina, max_stamina, unbanked_currency
) VALUES (
    'bot-299-char', 'bot-299-user', 1, 'Erebus_299', 'ddragon', 299, 912597206640,
    10000, 1000, 108100, 200, 1503, 0, 1,
    10000, 10000, 20, 20, 5, 5, 0
);

INSERT OR IGNORE INTO trophies (character_id) VALUES ('bot-299-char');
INSERT OR IGNORE INTO bank_accounts (user_id, balance) VALUES ('bot-299-user', 0);

-- The twelve def-focus abilities, maxed at ten copies each.
INSERT OR IGNORE INTO character_abilities (character_id, ability_id, quantity)
SELECT 'bot-299-char', id, 10 FROM abilities WHERE kind = 'equipment' AND focus = 'def';
