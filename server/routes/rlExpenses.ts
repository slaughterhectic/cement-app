import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { friendlyError } from '../lib/userError';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';
import { canEditTransport } from '../lib/transportAuth';

const router = Router();

// Sync a debit entry in rl_bank_transactions when an expense is paid via bank.
// Always deletes the old synced row first, then re-inserts if still bank mode.
async function syncBankForExpense({
  sourceId, mode, bankName, amount, date, category, description,
}: {
  sourceId: number; mode: string; bankName: string | null;
  amount: number; date: string; category: string | null; description: string | null;
}) {
  await query(
    `DELETE FROM rl_bank_transactions WHERE source_table='rl_expenses' AND source_id=$1`,
    [sourceId]
  );
  if (mode === 'bank' && bankName) {
    const bank = await getOne('SELECT id FROM rl_banks WHERE name=$1', [bankName]);
    if (bank) {
      await query(
        `INSERT INTO rl_bank_transactions (bank_id, date, type, amount, particulars, remarks, source_table, source_id)
         VALUES ($1,$2,'debit',$3,$4,$5,'rl_expenses',$6)`,
        [bank.id, date, amount, `Expense — ${category || 'General'}`, description || null, sourceId]
      );
    }
  }
}

// GET /rl/expenses?company=acc|jk
router.get('/', async (req, res) => {
  try {
    const company = typeof req.query.company === 'string' && ['acc', 'jk'].includes(req.query.company) ? req.query.company : null;
    const rows = company
      ? await getAll(`SELECT * FROM rl_expenses WHERE company=$1 ORDER BY date DESC, id DESC`, [company])
      : await getAll(`SELECT * FROM rl_expenses ORDER BY date DESC, id DESC`);
    const monthStart = new Date().toISOString().substring(0, 7) + '-01';
    const monthRow = company
      ? await getOne(`SELECT COALESCE(SUM(amount), 0) AS total FROM rl_expenses WHERE date >= $1 AND company=$2`, [monthStart, company])
      : await getOne(`SELECT COALESCE(SUM(amount), 0) AS total FROM rl_expenses WHERE date >= $1`, [monthStart]);
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
    const company = req.body.company || null;

    const row = await getOne(
      `INSERT INTO rl_expenses (date, category, description, amount, mode, bank_name, cash_handler, remarks, company)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [date, category || null, description || null, Number(amount), normalizedMode, bank, handler, remarks || null, company]
    );

    await Promise.all([
      syncImprestForCashTxn({
        sourceTable: 'rl_expenses', sourceId: row.id,
        mode: normalizedMode, cashHandler: handler,
        amount: Number(amount), date,
        particulars: `Transport expense — ${category || 'General'}`,
        narration: description || null,
      }),
      syncBankForExpense({
        sourceId: row.id, mode: normalizedMode, bankName: bank,
        amount: Number(amount), date, category: category || null, description: description || null,
      }),
    ]);

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

    const company = req.body.company || null;
    const row = await getOne(
      `UPDATE rl_expenses
         SET date=$1, category=$2, description=$3, amount=$4, mode=$5, bank_name=$6, cash_handler=$7, remarks=$8, company=$9
       WHERE id=$10 RETURNING *`,
      [date, category || null, description || null, Number(amount), normalizedMode, bank, handler, remarks || null, company, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Expense not found' });

    await Promise.all([
      syncImprestForCashTxn({
        sourceTable: 'rl_expenses', sourceId: row.id,
        mode: normalizedMode, cashHandler: handler,
        amount: Number(amount), date,
        particulars: `Transport expense — ${category || 'General'}`,
        narration: description || null,
      }),
      syncBankForExpense({
        sourceId: row.id, mode: normalizedMode, bankName: bank,
        amount: Number(amount), date, category: category || null, description: description || null,
      }),
    ]);

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!await canEditTransport(req)) return res.status(403).json({ error: 'Admin only' });
    const id = Number(req.params.id);
    await Promise.all([
      deleteImprestForSource('rl_expenses', id),
      query(`DELETE FROM rl_bank_transactions WHERE source_table='rl_expenses' AND source_id=$1`, [id]),
    ]);
    await query('DELETE FROM rl_expenses WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
