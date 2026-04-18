import { query, getOne } from '../db/database';

/**
 * Sync a cash transaction in any source table to imprest_transactions.
 *
 * Direction semantics (matches the imprest ledger):
 *   debit  = cash paid OUT by the handler  (money leaves their hand)
 *   credit = cash received BY the handler  (money comes into their hand)
 *
 * Most cash flows in this app are outflows (payments to parties, driver payments,
 * truck expenses, transporter payments) — those become a `debit` on the handler.
 * Pass `direction: 'credit'` for the rare case of cash coming back in.
 *
 * The row is keyed by (source_table, source_id) so re-calling this function
 * for the same source row UPSERTS the linked imprest entry (edits flow through).
 */
export async function syncImprestForCashTxn(opts: {
  sourceTable: string;
  sourceId: number;
  mode: string | null | undefined;
  cashHandler: string | null | undefined;
  amount: number;
  date: string;
  particulars: string;
  narration?: string | null;
  direction?: 'debit' | 'credit';
}): Promise<void> {
  const { sourceTable, sourceId, mode, cashHandler, amount, date, particulars } = opts;
  const direction = opts.direction ?? 'debit';
  const narration = opts.narration ?? null;

  // If this txn is no longer cash OR no handler chosen, make sure any previously
  // linked imprest row is removed so the handler's balance stays accurate.
  if (mode !== 'cash' || !cashHandler || !amount || amount <= 0) {
    await query(
      `DELETE FROM imprest_transactions WHERE source_table=$1 AND source_id=$2`,
      [sourceTable, sourceId]
    );
    return;
  }

  // Ensure the handler exists (keeps FK-like invariant even without a real FK).
  await query(
    `INSERT INTO imprest_handlers (handler_name, opening_balance)
       VALUES ($1, 0)
       ON CONFLICT (handler_name) DO NOTHING`,
    [cashHandler]
  );

  const debit  = direction === 'debit'  ? amount : 0;
  const credit = direction === 'credit' ? amount : 0;

  const existing = await getOne(
    `SELECT id FROM imprest_transactions WHERE source_table=$1 AND source_id=$2`,
    [sourceTable, sourceId]
  );
  if (existing) {
    await query(
      `UPDATE imprest_transactions
          SET date=$1, handler_name=$2, particulars=$3, narration=$4,
              debit=$5, credit=$6
        WHERE id=$7`,
      [date, cashHandler, particulars, narration, debit, credit, existing.id]
    );
  } else {
    await query(
      `INSERT INTO imprest_transactions
         (date, handler_name, particulars, narration, debit, credit, source_table, source_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [date, cashHandler, particulars, narration, debit, credit, sourceTable, sourceId]
    );
  }
}

export async function deleteImprestForSource(sourceTable: string, sourceId: number) {
  await query(
    `DELETE FROM imprest_transactions WHERE source_table=$1 AND source_id=$2`,
    [sourceTable, sourceId]
  );
}
