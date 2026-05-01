import { getOne, query } from '../db/database';

/** Net wallet balance: credits − debits. There's only one wallet so no scoping needed. */
export async function walletBalance(): Promise<number> {
  const r = await getOne(`
    SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END),0)::float AS bal
    FROM wallet_transactions
  `);
  return Number(r?.bal ?? 0);
}

/** FastTag balance = opening + credits − debits. */
export async function fastagBalance(fastagId: number): Promise<number> {
  const r = await getOne(`
    SELECT (
      COALESCE((SELECT opening_balance FROM fastags WHERE id=$1), 0)
      + COALESCE((SELECT SUM(CASE WHEN type='credit' THEN amount ELSE -amount END) FROM fastag_transactions WHERE fastag_id=$1), 0)
    )::float AS bal
  `, [fastagId]);
  return Number(r?.bal ?? 0);
}

/**
 * Drop existing wallet rows for a (source_table, source_id) and, if amount > 0, insert a fresh
 * debit. Used by truckTrips to keep the wallet ledger in sync with the trip's freight.
 */
export async function syncWalletDebitForSource(
  sourceTable: string,
  sourceId: number,
  amount: number,
  date: string,
  remarks: string | null,
): Promise<void> {
  await query(
    `DELETE FROM wallet_transactions WHERE source_table=$1 AND source_id=$2`,
    [sourceTable, sourceId]
  );
  if (amount > 0) {
    await query(
      `INSERT INTO wallet_transactions (date, type, amount, source_table, source_id, remarks)
       VALUES ($1,'debit',$2,$3,$4,$5)`,
      [date, amount, sourceTable, sourceId, remarks]
    );
  }
}

export async function deleteWalletForSource(sourceTable: string, sourceId: number): Promise<void> {
  await query(
    `DELETE FROM wallet_transactions WHERE source_table=$1 AND source_id=$2`,
    [sourceTable, sourceId]
  );
}

/**
 * Drop existing fastag rows for a (source_table, source_id) and, if a fastag id and amount are
 * provided, insert a fresh debit. Used by truckTrips to keep the fastag ledger in sync with toll.
 */
export async function syncFastagDebitForSource(
  sourceTable: string,
  sourceId: number,
  fastagId: number | null,
  amount: number,
  date: string,
  remarks: string | null,
): Promise<void> {
  await query(
    `DELETE FROM fastag_transactions WHERE source_table=$1 AND source_id=$2`,
    [sourceTable, sourceId]
  );
  if (fastagId && amount > 0) {
    await query(
      `INSERT INTO fastag_transactions (fastag_id, date, type, amount, source_table, source_id, remarks)
       VALUES ($1,$2,'debit',$3,$4,$5,$6)`,
      [fastagId, date, amount, sourceTable, sourceId, remarks]
    );
  }
}

export async function deleteFastagForSource(sourceTable: string, sourceId: number): Promise<void> {
  await query(
    `DELETE FROM fastag_transactions WHERE source_table=$1 AND source_id=$2`,
    [sourceTable, sourceId]
  );
}
