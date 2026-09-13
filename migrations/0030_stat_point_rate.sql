-- 0030: a stat point is now +10% of the class base, not +1%.
--
-- Points already spent were bought at 1%, and nothing records how many went
-- into ATK or DEF -- characters.atk holds the running total, not the count.
-- The count is recoverable though: at 1% per point the allocated share is
-- (atk - base), so the point count is (atk - base) * 100 / base, and the same
-- points at 10% are worth ten times as much. Multiplying the allocated share
-- by 10 therefore rescales exactly, with no division and no rounding drift.
--
-- Base values must match BASE_STATS in workers/src/core/classes.ts.

UPDATE characters
SET atk = CASE class
        WHEN 'phoenix'  THEN 1000 + (atk - 1000) * 10
        WHEN 'dphoenix' THEN 1750 + (atk - 1750) * 10
        WHEN 'dragon'   THEN  750 + (atk -  750) * 10
        WHEN 'ddragon'  THEN 1000 + (atk - 1000) * 10
        WHEN 'kies'     THEN  750 + (atk -  750) * 10
        ELSE atk
    END,
    def = CASE class
        WHEN 'phoenix'  THEN  500 + (def -  500) * 10
        WHEN 'dphoenix' THEN  375 + (def -  375) * 10
        WHEN 'dragon'   THEN 1100 + (def - 1100) * 10
        WHEN 'ddragon'  THEN 1000 + (def - 1000) * 10
        WHEN 'kies'     THEN  750 + (def -  750) * 10
        ELSE def
    END
WHERE class IN ('phoenix', 'dphoenix', 'dragon', 'ddragon', 'kies');
