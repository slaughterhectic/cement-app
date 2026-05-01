import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { requirePermission } from '../middleware/auth';

const router = Router();

router.get('/handlers', async (_req, res) => {
  try {
    const rows = await getAll(`SELECT * FROM imprest_handlers ORDER BY handler_name`);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.put('/handlers/:name', async (req, res) => {
  const { opening_balance } = req.body;
  try {
    const row = await getOne(
      `INSERT INTO imprest_handlers (handler_name, opening_balance)
       VALUES ($1,$2)
       ON CONFLICT (handler_name) DO UPDATE SET opening_balance=$2
       RETURNING *`,
      [req.params.name, opening_balance ?? 0]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.post('/handlers', async (req, res) => {
  const { handler_name, opening_balance } = req.body;
  try {
    const row = await getOne(
      `INSERT INTO imprest_handlers (handler_name, opening_balance)
       VALUES ($1,$2)
       ON CONFLICT (handler_name) DO UPDATE SET opening_balance=$2
       RETURNING *`,
      [handler_name, opening_balance ?? 0]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.get('/', async (req, res) => {
  try {
    const { handler, start_date, end_date } = req.query;
    let sql = `SELECT * FROM imprest_transactions WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;
    if (handler) { sql += ` AND handler_name=$${idx++}`; params.push(handler); }
    if (start_date) { sql += ` AND date >= $${idx++}`; params.push(start_date); }
    if (end_date) { sql += ` AND date <= $${idx++}`; params.push(end_date); }
    sql += ' ORDER BY date ASC, id ASC';
    const rows = await getAll(sql, params);

    // Compute running balance for each handler
    const handlerFilter = handler as string | undefined;
    const handlers = await getAll(`SELECT * FROM imprest_handlers${handlerFilter ? ' WHERE handler_name=$1' : ''} ORDER BY handler_name`, handlerFilter ? [handlerFilter] : []);

    const result = handlers.map((h: any) => {
      const txns = rows.filter((r: any) => r.handler_name === h.handler_name);
      let balance = Number(h.opening_balance);
      const withBalance = txns.map((t: any) => {
        balance = balance + Number(t.credit) - Number(t.debit);
        return { ...t, running_balance: balance };
      });
      return {
        handler_name: h.handler_name,
        opening_balance: Number(h.opening_balance),
        transactions: withBalance,
        current_balance: balance,
      };
    });

    res.json(result);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.post('/', async (req, res) => {
  const { date, handler_name, particulars, narration, debit, credit, remark } = req.body;
  try {
    const row = await getOne(
      `INSERT INTO imprest_transactions (date, handler_name, particulars, narration, debit, credit, remark)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [date, handler_name || 'Akash', particulars, narration, debit || 0, credit || 0, remark]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.put('/:id', async (req, res) => {
  const { date, handler_name, particulars, narration, debit, credit, remark } = req.body;
  try {
    const row = await getOne(
      `UPDATE imprest_transactions SET date=$1, handler_name=$2, particulars=$3, narration=$4, debit=$5, credit=$6, remark=$7
       WHERE id=$8 RETURNING *`,
      [date, handler_name || 'Akash', particulars, narration, debit || 0, credit || 0, remark, req.params.id]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id', requirePermission('delete_imprest'), async (req, res) => {
  try {
    await query('DELETE FROM imprest_transactions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
