import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';

const router = Router();

// Compute current balance for a single bank (mirrors capital summary math).
// Used to reject transfers that would overdraw the source bank.
async function bankBalance(bank: string): Promise<number> {
  const row = await getOne(
    `
    SELECT (
      COALESCE((SELECT opening_balance FROM bank_balances WHERE LOWER(TRIM(bank_name)) = LOWER(TRIM($1)) LIMIT 1), 0)
      + COALESCE((SELECT SUM(amount) FROM payments WHERE mode='bank' AND direction='receive' AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM payments WHERE mode='bank' AND direction='pay'     AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM expenses           WHERE mode='bank' AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM truck_expenses     WHERE mode='bank' AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM driver_payments    WHERE mode='bank' AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM transporter_payments WHERE mode='bank' AND COALESCE(payment_type,'paid')='paid' AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      + COALESCE((SELECT SUM(amount) FROM transporter_payments WHERE mode='bank' AND payment_type='received'                AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM party_loans WHERE mode='bank' AND type='disbursement' AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      + COALESCE((SELECT SUM(amount) FROM party_loans WHERE mode='bank' AND type='repayment'    AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM loan_repayments WHERE mode='bank' AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM assets          WHERE mode='bank' AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM asset_topups    WHERE mode='bank' AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM wallet_transactions WHERE type='credit' AND mode='bank' AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM fastag_transactions WHERE type='credit'                 AND LOWER(TRIM(COALESCE(bank_name,''))) = LOWER(TRIM($1))), 0)
      + COALESCE((SELECT SUM(amount) FROM bank_transfers WHERE LOWER(TRIM(to_bank))   = LOWER(TRIM($1))), 0)
      - COALESCE((SELECT SUM(amount) FROM bank_transfers WHERE LOWER(TRIM(from_bank)) = LOWER(TRIM($1))), 0)
    ) AS balance
    `,
    [bank]
  );
  return Number(row?.balance ?? 0);
}

// GET /api/bank-transfers
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`SELECT * FROM bank_transfers ORDER BY date DESC, id DESC`);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /api/bank-transfers
router.post('/', async (req, res) => {
  const { date, from_bank, to_bank, amount, remarks } = req.body;
  if (!date || !from_bank || !to_bank || !amount) {
    return res.status(400).json({ error: 'date, from_bank, to_bank and amount are required' });
  }
  if (from_bank === to_bank) {
    return res.status(400).json({ error: 'From and To bank must be different' });
  }
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'amount must be > 0' });
  try {
    const sourceBalance = await bankBalance(from_bank);
    if (amt > sourceBalance + 1e-6) {
      return res.status(400).json({ error: `Transfer exceeds ${from_bank} balance (₹${sourceBalance.toFixed(2)} available)` });
    }
    const row = await getOne(
      `INSERT INTO bank_transfers (date, from_bank, to_bank, amount, remarks)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [date, from_bank, to_bank, amt, remarks || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /api/bank-transfers/:id  (admin only)
router.put('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { date, from_bank, to_bank, amount, remarks } = req.body;
  if (!date || !from_bank || !to_bank || !amount) {
    return res.status(400).json({ error: 'date, from_bank, to_bank and amount are required' });
  }
  if (from_bank === to_bank) return res.status(400).json({ error: 'From and To bank must be different' });
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'amount must be > 0' });
  try {
    // Compute the source-bank balance excluding the current transfer so the cap reflects
    // the user's intent to change this row.
    const sourceBalance = await bankBalance(from_bank);
    const current = await getOne(`SELECT amount, from_bank FROM bank_transfers WHERE id=$1`, [req.params.id]);
    if (!current) return res.status(404).json({ error: 'Transfer not found' });
    const adjustedBalance = current.from_bank === from_bank
      ? sourceBalance + Number(current.amount) // add the existing outflow back
      : sourceBalance;
    if (amt > adjustedBalance + 1e-6) {
      return res.status(400).json({ error: `Transfer exceeds ${from_bank} balance (₹${adjustedBalance.toFixed(2)} available)` });
    }
    const row = await getOne(
      `UPDATE bank_transfers SET date=$1, from_bank=$2, to_bank=$3, amount=$4, remarks=$5
       WHERE id=$6 RETURNING *`,
      [date, from_bank, to_bank, amt, remarks || null, req.params.id]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /api/bank-transfers/:id  (admin only)
router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await query(`DELETE FROM bank_transfers WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
