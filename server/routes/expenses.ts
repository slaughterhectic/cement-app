import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { requirePermission } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, category } = req.query;
    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (start_date) { sql += ` AND date >= $${idx++}`; params.push(start_date); }
    if (end_date) { sql += ` AND date <= $${idx++}`; params.push(end_date); }
    if (category) { sql += ` AND category = $${idx++}`; params.push(category); }

    sql += ' ORDER BY date DESC, id DESC';
    const rows = await getAll(sql, params);

    const monthTotal = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      WHERE to_char(date::date, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM')
    `);

    res.json({ data: rows, monthTotal: Number(monthTotal.total) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { date, amount, category, description, bank_name, mode } = req.body;
  try {
    const result = await getOne(
      'INSERT INTO expenses (date, amount, category, description, bank_name, mode) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [date, amount, category, description, bank_name, mode]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', requirePermission('delete_expenses'), async (req, res) => {
  try {
    await query('DELETE FROM expenses WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
