import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';

const router = Router();

// GET /driver-payments
router.get('/', async (req, res) => {
  try {
    const { driver_id } = req.query;
    let sql = `
      SELECT dp.*, d.name as driver_name, tt.date as trip_date
      FROM driver_payments dp
      JOIN drivers d ON dp.driver_id = d.id
      LEFT JOIN truck_trips tt ON dp.trip_id = tt.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (driver_id) { sql += ` AND dp.driver_id = $${idx++}`; params.push(driver_id); }

    sql += ' ORDER BY dp.date DESC, dp.id DESC';
    res.json(await getAll(sql, params));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /driver-payments
router.post('/', async (req, res) => {
  try {
    const { date, driver_id, amount, mode, bank_name, trip_id, remarks } = req.body;
    if (!date || !driver_id || !amount) return res.status(400).json({ error: 'date, driver_id and amount are required' });
    const row = await getOne(
      `INSERT INTO driver_payments (date, driver_id, amount, mode, bank_name, trip_id, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [date, driver_id, amount, mode || 'cash', bank_name || null, trip_id || null, remarks || null]
    );
    const full = await getOne(
      `SELECT dp.*, d.name as driver_name FROM driver_payments dp JOIN drivers d ON dp.driver_id=d.id WHERE dp.id=$1`,
      [row.id]
    );
    res.json(full);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /driver-payments/:id (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await query('DELETE FROM driver_payments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
