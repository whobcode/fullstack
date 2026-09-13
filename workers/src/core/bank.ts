/**
 * The bank.
 *
 * Currency a character is holding (`characters.unbanked_currency`) is
 * spendable but stealable — the winner of a fight takes a share. Banked
 * currency is safe but has to be withdrawn before it can be spent. Depositing
 * costs a fee; withdrawing is free.
 *
 * Balances live in `bank_accounts` with an append-only `bank_ledger` beside
 * them, both in social_rpg_db rather than a database of their own. That is
 * deliberate: D1 has no cross-database transactions, so a bank in a separate
 * database would make every transfer a debit-here / credit-there pair with no
 * atomicity, and a failure in between would either destroy or mint currency.
 * Here a transfer is a single db.batch() and cannot half-happen.
 *
 * Two database-level guards back that up, because a guarded UPDATE matching no
 * rows is not an error in SQLite and would let a batch commit one side of a
 * transfer without the other:
 *   - `characters_no_overdraft` (trigger)  aborts the batch if holdings go < 0
 *   - `bank_accounts.balance CHECK (>= 0)` aborts the batch if a withdrawal
 *     would overdraw
 */

/** Fraction of a deposit taken as a fee. */
export const DEPOSIT_FEE_RATE = 0.1;

/** Fee charged on a deposit of `amount`. Withdrawals are free. */
export function depositFee(amount: number): number {
  return Math.floor(amount * DEPOSIT_FEE_RATE);
}

export interface BankSnapshot {
  character_id: string;
  balance: number;
  unbanked_currency: number;
}

export interface TransferResult extends BankSnapshot {
  kind: 'deposit' | 'withdraw';
  /** Currency that left the source. */
  amount: number;
  fee: number;
  /** Currency that actually arrived at the destination. */
  net: number;
}

/** Thrown for conditions the player should see, rather than a 500. */
export class BankError extends Error {}

/** Current holdings and balance for one character. */
export async function getSnapshot(db: D1Database, characterId: string): Promise<BankSnapshot | null> {
  const row = await db
    .prepare(`
      SELECT c.id AS character_id,
             c.unbanked_currency,
             COALESCE(b.balance, 0) AS balance
      FROM characters c
      LEFT JOIN bank_accounts b ON b.character_id = c.id
      WHERE c.id = ?
    `)
    .bind(characterId)
    .first<BankSnapshot>();
  return row ?? null;
}

/** Most recent movements, newest first. */
export async function recentLedger(db: D1Database, characterId: string, limit = 20) {
  const rows = await db
    .prepare(`
      SELECT id, kind, amount, fee, balance_after,
             strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at
      FROM bank_ledger
      WHERE character_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `)
    .bind(characterId, limit)
    .all();
  return rows.results || [];
}

/**
 * Move currency from a character's hand into the bank, minus the fee.
 * The whole transfer is one atomic batch.
 */
export async function deposit(db: D1Database, characterId: string, amount: number): Promise<TransferResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BankError('Enter a whole amount greater than zero.');
  }

  const before = await getSnapshot(db, characterId);
  if (!before) throw new BankError('Character not found.');
  if (amount > before.unbanked_currency) {
    throw new BankError(`You are only holding ${before.unbanked_currency.toLocaleString()}.`);
  }

  const fee = depositFee(amount);
  const net = amount - fee;

  try {
    await db.batch([
      // Guarded by the characters_no_overdraft trigger: if this would take
      // holdings below zero it aborts, and the credit below never commits.
      db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency - ? WHERE id = ?')
        .bind(amount, characterId),
      db.prepare(`
        INSERT INTO bank_accounts (character_id, balance) VALUES (?, ?)
        ON CONFLICT(character_id) DO UPDATE SET
          balance = balance + excluded.balance,
          updated_at = CURRENT_TIMESTAMP
      `).bind(characterId, net),
      // Runs after the credit, so balance_after reads the new balance.
      db.prepare(`
        INSERT INTO bank_ledger (character_id, kind, amount, fee, balance_after)
        SELECT ?, 'deposit', ?, ?, balance FROM bank_accounts WHERE character_id = ?
      `).bind(characterId, amount, fee, characterId),
    ]);
  } catch (e: any) {
    throw new BankError(describe(e, 'Deposit failed and nothing was moved.'));
  }

  const after = await getSnapshot(db, characterId);
  return { ...(after as BankSnapshot), kind: 'deposit', amount, fee, net };
}

/** Move currency out of the bank and back into the character's hand. Free. */
export async function withdraw(db: D1Database, characterId: string, amount: number): Promise<TransferResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BankError('Enter a whole amount greater than zero.');
  }

  const before = await getSnapshot(db, characterId);
  if (!before) throw new BankError('Character not found.');
  if (amount > before.balance) {
    throw new BankError(`Your bank balance is only ${before.balance.toLocaleString()}.`);
  }

  try {
    await db.batch([
      // Guarded by CHECK (balance >= 0): overdrawing aborts the whole batch,
      // so the credit below never commits on its own.
      db.prepare('UPDATE bank_accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE character_id = ?')
        .bind(amount, characterId),
      db.prepare('UPDATE characters SET unbanked_currency = unbanked_currency + ? WHERE id = ?')
        .bind(amount, characterId),
      db.prepare(`
        INSERT INTO bank_ledger (character_id, kind, amount, fee, balance_after)
        SELECT ?, 'withdraw', ?, 0, balance FROM bank_accounts WHERE character_id = ?
      `).bind(characterId, amount, characterId),
    ]);
  } catch (e: any) {
    throw new BankError(describe(e, 'Withdrawal failed and nothing was moved.'));
  }

  const after = await getSnapshot(db, characterId);
  return { ...(after as BankSnapshot), kind: 'withdraw', amount, fee: 0, net: amount };
}

/** Turn a constraint abort into something a player can read. */
function describe(e: any, fallback: string): string {
  const msg = String(e?.message ?? '');
  if (msg.includes('insufficient unbanked currency')) return 'You are not holding that much.';
  if (msg.includes('balance >= 0')) return 'Your bank balance is not that high.';
  return fallback;
}
