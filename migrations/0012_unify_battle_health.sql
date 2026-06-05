-- Unify the battle health pool with the character's HP stat.
--
-- max_health was hardcoded ~100 while the hp stat is in the thousands, so
-- attacks either did nothing (defense > attack) or one-shot the tiny pool —
-- you could never watch health tick down. Seed the battle pool from hp so
-- damage chips it gradually and the HP you allocate actually matters.

UPDATE characters SET max_health = MAX(hp, 100), current_health = MAX(hp, 100);
