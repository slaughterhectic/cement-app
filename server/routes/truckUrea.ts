import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { syncWalletDebitForSource, deleteWalletForSource } from '../lib/walletSync';

const router = Router();

// GET /api/truck-urea  (optionally ?month=YYYY-MM)
router.get('/', async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const rows = month
      ? await getAll(`SELECT * FROM truck_urea_charges WHERE month = $1 ORDER BY id DESC`, [month])
      : await getAll(`SELECT * FROM truck_urea_charges ORDER BY month DESC`);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

// POST /api/truck-urea — upsert by month
router.post('/', async (req, res) => {
  const { month, amount, remarks } = req.body;
  if (!month || amount === undefined || amount === null) {
    return res.status(400).json({ error: 'month and amount are required' });
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) {
    return res.status(400).json({ error: 'amount must be a non-negative number' });
  }
  try {
    const row = await getOne(
      `INSERT INTO truck_urea_charges (month, amount, remarks)
       VALUES ($1, $2, $3)
       ON CONFLICT (month) DO UPDATE SET amount = $2, remarks = $3
       RETURNING *`,
      [month, amt, remarks || null]
    );
    await syncWalletDebitForSource('truck_urea', row.id, amt, row.month + '-01', `Monthly Urea — ${row.month}`);
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

// DELETE /api/truck-urea/:id
router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const row = await getOne(`SELECT id FROM truck_urea_charges WHERE id = $1`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    await deleteWalletForSource('truck_urea', Number(req.params.id));
    await query(`DELETE FROM truck_urea_charges WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

export default router;
