import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { friendlyError } from '../lib/userError';
import { requirePermission } from '../middleware/auth';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';

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
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.post('/', async (req, res) => {
  const { date, amount, category, description, bank_name, cash_handler, mode } = req.body;
  try {
    // All non-admin entries — present or past — go through admin approval.
    if (req.user?.role !== 'admin') {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name)
         VALUES ('expense', $1::jsonb, $2, $3) RETURNING id`,
        [JSON.stringify(req.body), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    const normalizedMode = mode || 'cash';
    const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
    const bank    = normalizedMode === 'bank' ? (bank_name    || null) : null;

    const result = await getOne(
      `INSERT INTO expenses (date, amount, category, description, bank_name, cash_handler, mode)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [date, amount, category, description, bank, handler, normalizedMode]
    );

    await syncImprestForCashTxn({
      sourceTable: 'expenses',
      sourceId: result.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      particulars: `Expense — ${category || 'General'}`,
      narration: description || null,
    });

    res.json(result);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id', requirePermission('delete_expenses'), async (req, res) => {
  try {
    await deleteImprestForSource('expenses', Number(req.params.id));
    await query('DELETE FROM expenses WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
