-- 0032: make health_skill_points authoritative for allocated health.
--
-- There are two ways to spend a point on health. /storm8/skills/allocate
-- increments health_skill_points; the character sheet's allocate-points adds
-- straight to max_health and records nothing. So the column undercounts, and
-- anything recomputing the pool from it -- which the max-level bonus needs to
-- do, since the bonus changes when another character reaches 300 -- would wipe
-- every point spent through the character sheet.
--
-- max_health is the truth today, so the point count is derived back out of it:
-- strip the max-level multiplier, strip the ability percentage, subtract the
-- class base and the flat ability health, and divide by the 100 each point is
-- worth. Derived for every character, not only those at zero, so a character
-- that used both paths ends up with one correct total rather than two partial
-- ones.
--
-- Characters whose max_health is below their class base (a handful predating
-- the health unification in 0012, some with negative hp) clamp to 0 points,
-- which raises them to their base pool rather than leaving them at 100.

UPDATE characters
SET health_skill_points = MAX(0, CAST(
    (
      (
        max_health
        / (1 + 1.0 * (
            SELECT COUNT(*) FROM characters mlc
            WHERE mlc.user_id = characters.user_id AND mlc.level >= 300
          ))
        / (1 + COALESCE((
            SELECT SUM(ca.quantity * a.hp_pct)
            FROM character_abilities ca JOIN abilities a ON a.id = ca.ability_id
            WHERE ca.character_id = characters.id AND a.kind = 'equipment'
          ), 0) / 100.0)
      )
      - (CASE class
           WHEN 'kies' THEN 15000
           WHEN 'phoenix' THEN 10000
           WHEN 'dphoenix' THEN 10000
           WHEN 'dragon' THEN 10000
           WHEN 'ddragon' THEN 10000
           ELSE 10000
         END)
      - COALESCE((
          SELECT SUM(ca.quantity * a.hp_value)
          FROM character_abilities ca JOIN abilities a ON a.id = ca.ability_id
          WHERE ca.character_id = characters.id AND a.kind = 'equipment'
        ), 0)
    ) / 100
  AS INTEGER))
WHERE class IS NOT NULL;
