-- Reinstate the phone_hash column that 0019 dropped.
--
-- 0019 is left in place rather than edited away: applied migrations are history,
-- and re-adding the column forward is the only change that behaves correctly
-- whether or not 0019 has already run against a given database. Migrations run
-- in order, so a database that has seen neither drops the column and then gets
-- it back; one that already applied 0019 simply gets it back.
--
-- phone_hash holds an HMAC-SHA256 of the E.164 number, keyed by the
-- PHONE_HASH_PEPPER secret. Contact matching compares these rather than raw
-- numbers.
--
-- Worth knowing what this does and does not protect, since users.phone still
-- stores the same number in plaintext for login lookup: the keyed hash means a
-- dump of this column alone is not a reversible phone list, but an attacker who
-- reads the whole row has the number anyway. It becomes a genuine defence only
-- if raw numbers stop being stored -- hash on the way in, look up by hash at
-- login. Until then it is defence in depth against partial exposure (a leaked
-- index, a query that selects only the hash, a log line), not a substitute for
-- not holding the data.

ALTER TABLE users ADD COLUMN phone_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_users_phone_hash
    ON users(phone_hash) WHERE phone_hash IS NOT NULL;
