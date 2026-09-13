-- 0024: the bank becomes one account per player, shared by all their characters.
--
-- It was keyed on character_id, so a player with several characters had
-- several separate balances and currency banked on one was unreachable from
-- another. The bank is now per user; the ledger still records which character
-- moved the money, so history stays attributable.

CREATE TABLE bank_accounts_new (
    user_id TEXT PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Merge every character's balance into their owner's single account.
INSERT INTO bank_accounts_new (user_id, balance)
SELECT c.user_id, COALESCE(SUM(b.balance), 0)
FROM bank_accounts b
JOIN characters c ON c.id = b.character_id
GROUP BY c.user_id;

-- Anyone with characters but no prior bank row still gets an account, so reads
-- never have to special-case a missing row.
INSERT OR IGNORE INTO bank_accounts_new (user_id, balance)
SELECT DISTINCT user_id, 0 FROM characters;

-- Safe to drop: bank_ledger's foreign key points at characters, not at this
-- table, so nothing cascades.
DROP TABLE bank_accounts;
ALTER TABLE bank_accounts_new RENAME TO bank_accounts;

-- The ledger keeps character_id (who moved it) and gains user_id (whose
-- account it moved in and out of).
ALTER TABLE bank_ledger ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE bank_ledger
SET user_id = (SELECT c.user_id FROM characters c WHERE c.id = bank_ledger.character_id)
WHERE user_id IS NULL;

CREATE INDEX idx_bank_ledger_user ON bank_ledger(user_id, created_at DESC);
