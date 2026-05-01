import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';
import { walletBalance } from '../lib/walletSync';

const router = Router();

// GET /api/wallet/summary
router.get('/summary', async (_req, res) => {
  try {
    const [totals, balance] = await Promise.all([
      getOne(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE type='credit'),0)::float AS total_credits,
          COALESCE(SUM(amount) FILTER (WHERE type='debit'),0)::float  AS total_debits,
          COUNT(*)::int AS count
        FROM wallet_transactions
      `),
      walletBalance(),
    ]);
    res.json({
      total_credits: Number(totals?.total_credits ?? 0),
      total_debits: Number(totals?.total_debits ?? 0),
      count: Number(totals?.count ?? 0),
      balance,
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /api/wallet/transactions
router.get('/transactions', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT wt.*, tt.truck_id, t.truck_number
      FROM wallet_transactions wt
      LEFT JOIN truck_trips tt ON wt.source_table='truck_trip' AND tt.id = wt.source_id
      LEFT JOIN trucks t ON t.id = tt.truck_id
      ORDER BY wt.date DESC, wt.id DESC
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /api/wallet/credit — top up the wallet from bank or cash handler
router.post('/credit', async (req, res) => {
  const { date, amount, mode, bank_name, cash_handler, remarks } = req.body;
  if (!date || !amount) return res.status(400).json({ error: 'date and amount are required' });
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'Amount must be > 0' });
  const m = mode === 'cash' ? 'cash' : 'bank';
  const handler = m === 'cash' ? (cash_handler || null) : null;
  const bank = m === 'bank' ? (bank_name || null) : null;
  if (m === 'bank' && !bank) return res.status(400).json({ error: 'Pick a bank' });
  if (m === 'cash' && !handler) return res.status(400).json({ error: 'Pick a cash handler' });

  try {
    const row = await getOne(
      `INSERT INTO wallet_transactions (date, type, amount, mode, bank_name, cash_handler, source_table, remarks)
       VALUES ($1,'credit',$2,$3,$4,$5,'manual',$6) RETURNING *`,
      [date, amt, m, bank, handler, remarks?.trim() || null]
    );
    // Cash handler credit must move money out of that handler's cash book.
    await syncImprestForCashTxn({
      sourceTable: 'wallet_transactions',
      sourceId: row.id,
      mode: m,
      cashHandler: handler,
      amount: amt,
      date,
      particulars: 'Wallet top-up',
      narration: remarks || null,
    });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /api/wallet/transactions/:id  (admin only — reverses the cash/bank effect too)
router.delete('/transactions/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await deleteImprestForSource('wallet_transactions', Number(req.params.id));
    await query('DELETE FROM wallet_transactions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
