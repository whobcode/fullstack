-- Track when each character last regenerated health (for passive health regen).
-- (SQLite disallows CURRENT_TIMESTAMP as an ADD COLUMN default, so backfill it.)
ALTER TABLE characters ADD COLUMN last_health_regen TIMESTAMP;
UPDATE characters SET last_health_regen = CURRENT_TIMESTAMP WHERE last_health_regen IS NULL;
