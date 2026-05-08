import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';

const router = Router();

// GET /api/truck-emi-repayments  (optionally ?truck_id= and ?month=)
router.get('/', async (req, res) => {
  try {
    const truckId = req.query.truck_id ? Number(req.query.truck_id) : null;
    const month = req.query.month as string | undefined;

    let sql = `SELECT r.*, t.truck_number FROM truck_emi_repayments r
               JOIN trucks t ON t.id = r.truck_id
               WHERE 1=1`;
    const params: any[] = [];

    if (truckId) {
      params.push(truckId);
      sql += ` AND r.truck_id = $${params.length}`;
    }
    if (month) {
      params.push(month);
      sql += ` AND to_char(r.date::date, 'YYYY-MM') = $${params.length}`;
    }
    sql += ` ORDER BY r.date DESC, r.id DESC`;

    const rows = await getAll(sql, params.length ? params : undefined);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

// POST /api/truck-emi-repayments — insert
router.post('/', async (req, res) => {
  const { truck_id, date, amount, mode, bank_name, remarks } = req.body;
  if (!truck_id || !date || amount === undefined || amount === null) {
    return res.status(400).json({ error: 'truck_id, date and amount are required' });
  }
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'amount must be greater than 0' });
  const normalizedMode = mode === 'cash' ? 'cash' : 'bank';
  const bank = normalizedMode === 'bank' ? (bank_name || null) : null;

  try {
    const truck = await getOne(`SELECT id FROM trucks WHERE id = $1`, [truck_id]);
    if (!truck) return res.status(404).json({ error: 'Truck not found' });

    const row = await getOne(
      `INSERT INTO truck_emi_repayments (truck_id, date, amount, mode, bank_name, remarks)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [Number(truck_id), date, amt, normalizedMode, bank, remarks || null]
    );
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

// DELETE /api/truck-emi-repayments/:id (admin only)
router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const row = await getOne(`SELECT id FROM truck_emi_repayments WHERE id = $1`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Repayment not found' });
    await query(`DELETE FROM truck_emi_repayments WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

export default router;
