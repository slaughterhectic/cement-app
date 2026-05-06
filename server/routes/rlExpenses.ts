import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { friendlyError } from '../lib/userError';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';
import { canEditTransport } from '../lib/transportAuth';

const router = Router();

// GET /rl/expenses
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`SELECT * FROM rl_expenses ORDER BY date DESC, id DESC`);
    const monthStart = new Date().toISOString().substring(0, 7) + '-01';
    const monthRow = await getOne(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM rl_expenses WHERE date >= $1`,
      [monthStart]
    );
    res.json({ data: rows, monthTotal: Number(monthRow?.total ?? 0) });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.post('/', async (req, res) => {
  try {
    const { date, category, description, amount, mode, bank_name, cash_handler, remarks } = req.body;
    if (!date || !amount) return res.status(400).json({ error: 'date and amount are required' });

    if (!await canEditTransport(req)) {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name, source)
         VALUES ('rl_expense', $1::jsonb, $2, $3, 'transportbook') RETURNING id`,
        [JSON.stringify(req.body), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    const normalizedMode = mode || 'cash';
    const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
    const bank    = normalizedMode === 'bank' ? (bank_name    || null) : null;

    const row = await getOne(
      `INSERT INTO rl_expenses (date, category, description, amount, mode, bank_name, cash_handler, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [date, category || null, description || null, Number(amount), normalizedMode, bank, handler, remarks || null]
    );

    await syncImprestForCashTxn({
      sourceTable: 'rl_expenses',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      particulars: `Transport expense — ${category || 'General'}`,
      narration: description || null,
    });

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { date, category, description, amount, mode, bank_name, cash_handler, remarks } = req.body;
    if (!date || !amount) return res.status(400).json({ error: 'date and amount are required' });

    const normalizedMode = mode || 'cash';
    const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
    const bank    = normalizedMode === 'bank' ? (bank_name    || null) : null;

    const row = await getOne(
      `UPDATE rl_expenses
         SET date=$1, category=$2, description=$3, amount=$4, mode=$5, bank_name=$6, cash_handler=$7, remarks=$8
       WHERE id=$9 RETURNING *`,
      [date, category || null, description || null, Number(amount), normalizedMode, bank, handler, remarks || null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Expense not found' });

    await syncImprestForCashTxn({
      sourceTable: 'rl_expenses',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      particulars: `Transport expense — ${category || 'General'}`,
      narration: description || null,
    });

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!await canEditTransport(req)) return res.status(403).json({ error: 'Admin only' });
    await deleteImprestForSource('rl_expenses', Number(req.params.id));
    await query('DELETE FROM rl_expenses WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
