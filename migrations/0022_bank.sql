-- 0022: The bank gets its own tables, with an append-only ledger.
--
-- Balances used to be a `banked_currency` column on characters. Splitting the
-- bank out gives it an audit trail and a single place to reason about, while
-- staying inside social_rpg_db on purpose: D1 has no cross-database
-- transactions, so a bank in a separate database would make every transfer a
-- non-atomic debit-here / credit-there pair that can destroy or mint currency
-- if it fails in between. Here a transfer is one db.batch() -- all or nothing.
--
-- Currency is per character, not per account, matching unbanked_currency.

CREATE TABLE bank_accounts (
    character_id TEXT PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Every movement, in order. Never updated, only appended, so a balance can
-- always be re-derived and disputes can be traced.
CREATE TABLE bank_ledger (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    character_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('deposit', 'withdraw')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    fee INTEGER NOT NULL DEFAULT 0,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX idx_bank_ledger_character ON bank_ledger(character_id, created_at DESC);

-- Give every existing character an account so reads never have to special-case
-- a missing row (same approach as 0011 for trophies).
INSERT OR IGNORE INTO bank_accounts (character_id, balance)
SELECT id, COALESCE(banked_currency, 0) FROM characters;

-- bank_accounts.balance is the single source of truth now; leaving the old
-- column would give the same value two homes. Checked before writing this:
-- 0 characters of 288 hold a non-zero banked balance, so nothing is lost.
ALTER TABLE characters DROP COLUMN banked_currency;

-- Overdraft guard.
--
-- A D1 batch is atomic, but a guarded `UPDATE ... WHERE unbanked_currency >= ?`
-- that matches no rows is not an error -- the batch would happily commit the
-- bank credit without the matching debit, minting currency. RAISE(ABORT) makes
-- the whole batch roll back instead, so "debit succeeded" and "credit
-- succeeded" cannot come apart.
--
-- bank_accounts.balance has CHECK (balance >= 0) for the same reason on the
-- withdraw side. This trigger also covers every other currency sink that
-- already existed -- ability purchases, bounty posting, hospital heals.
CREATE TRIGGER characters_no_overdraft
BEFORE UPDATE OF unbanked_currency ON characters
WHEN NEW.unbanked_currency < 0
BEGIN
    SELECT RAISE(ABORT, 'insufficient unbanked currency');
END;
