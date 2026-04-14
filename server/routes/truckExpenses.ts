import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';

const router = Router();

// GET /truck-expenses
router.get('/', async (req, res) => {
  try {
    const { truck_id } = req.query;
    let sql = `
      SELECT te.*, t.truck_number
      FROM truck_expenses te
      LEFT JOIN trucks t ON te.truck_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (truck_id) { sql += ` AND te.truck_id = $${idx++}`; params.push(truck_id); }

    sql += ' ORDER BY te.date DESC, te.id DESC';
    res.json(await getAll(sql, params));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /truck-expenses
router.post('/', async (req, res) => {
  try {
    const { date, truck_id, category, description, amount, mode, bank_name } = req.body;
    if (!date || !amount) return res.status(400).json({ error: 'date and amount are required' });
    const row = await getOne(
      `INSERT INTO truck_expenses (date, truck_id, category, description, amount, mode, bank_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [date, truck_id || null, category || null, description || null, amount, mode || 'cash', bank_name || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /truck-expenses/:id (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await query('DELETE FROM truck_expenses WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
