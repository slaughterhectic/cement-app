import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

// GET /api/bank-transfers
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`SELECT * FROM bank_transfers ORDER BY date DESC, id DESC`);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
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
    const row = await getOne(
      `INSERT INTO bank_transfers (date, from_bank, to_bank, amount, remarks)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [date, from_bank, to_bank, amt, remarks || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /api/bank-transfers/:id  (admin only)
router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await query(`DELETE FROM bank_transfers WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
