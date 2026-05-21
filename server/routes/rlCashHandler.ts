import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';

const router = Router();

const TB_SOURCES = ['rl_expenses', 'rl_diesel_credit'];

// GET /rl/cash-handler/handlers — list local transport-book handlers
router.get('/handlers', async (_req, res) => {
  try {
    const rows = await getAll(
      `SELECT id, name, opening_balance, is_active FROM rl_cash_handlers ORDER BY name`
    );
    res.json(rows.map((r: any) => ({ ...r, opening_balance: Number(r.opening_balance) })));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /rl/cash-handler/handlers — add handler
router.post('/handlers', async (req, res) => {
  try {
    const { name, opening_balance } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const ob = Number(opening_balance) || 0;
    const row = await getOne(
      `INSERT INTO rl_cash_handlers (name, opening_balance)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET opening_balance=$2, is_active=1
       RETURNING *`,
      [name.trim(), ob]
    );
    res.json({ ...row, opening_balance: Number(row.opening_balance) });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /rl/cash-handler/handlers/:name — deactivate handler
router.delete('/handlers/:name', async (req, res) => {
  try {
    await query(
      `UPDATE rl_cash_handlers SET is_active=0 WHERE name=$1`,
      [decodeURIComponent(req.params.name)]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /rl/cash-handler?handler=NAME&month=YYYY-MM
router.get('/', async (req, res) => {
  try {
    const { handler, month } = req.query as Record<string, string>;

    const params: any[] = [TB_SOURCES];
    let where = `WHERE it.source_table = ANY($1)`;
    let idx = 2;

    if (handler) { where += ` AND it.handler_name=$${idx++}`; params.push(handler); }
    if (month)   { where += ` AND it.date LIKE $${idx++}`;    params.push(`${month}%`); }

    const [txns, handlerList, summary] = await Promise.all([
      getAll(
        `SELECT it.* FROM imprest_transactions it ${where} ORDER BY it.date DESC, it.id DESC`,
        params
      ),
      // Handlers from the local table (shows all active, even if no transactions yet)
      getAll(`SELECT name FROM rl_cash_handlers WHERE is_active=1 ORDER BY name`),
      getAll(
        `SELECT
           it.handler_name,
           rch.opening_balance,
           COALESCE(SUM(it.credit),0)::float AS total_credit,
           COALESCE(SUM(it.debit),0)::float  AS total_debit,
           COUNT(*)::int                     AS txn_count
         FROM imprest_transactions it
         LEFT JOIN rl_cash_handlers rch ON rch.name = it.handler_name
         WHERE it.source_table = ANY($1)
         GROUP BY it.handler_name, rch.opening_balance
         ORDER BY it.handler_name`,
        [TB_SOURCES]
      ),
    ]);

    const allTimeTotals = await getAll(
      `SELECT
         it.handler_name,
         COALESCE(rch.opening_balance, 0)::float AS opening_balance,
         COALESCE(SUM(it.credit),0)::float       AS total_credit,
         COALESCE(SUM(it.debit),0)::float        AS total_debit
       FROM imprest_transactions it
       LEFT JOIN rl_cash_handlers rch ON rch.name = it.handler_name
       WHERE it.source_table = ANY($1)
       GROUP BY it.handler_name, rch.opening_balance`,
      [TB_SOURCES]
    );

    const balanceMap: Record<string, number> = {};
    for (const r of allTimeTotals) {
      const ob = Number(r.opening_balance) || 0;
      balanceMap[r.handler_name] = ob + Number(r.total_credit) - Number(r.total_debit);
    }

    // Include handlers from rl_cash_handlers that have no transactions (opening balance only)
    const allHandlers = await getAll(
      `SELECT name, opening_balance FROM rl_cash_handlers WHERE is_active=1`
    );
    for (const h of allHandlers) {
      if (!(h.name in balanceMap)) {
        balanceMap[h.name] = Number(h.opening_balance) || 0;
      }
    }

    res.json({
      transactions: txns.map((t: any) => ({
        ...t,
        debit:  Number(t.debit)  || 0,
        credit: Number(t.credit) || 0,
      })),
      handlers: handlerList.map((h: any) => h.name),
      summary: summary.map((s: any) => ({
        handler_name:    s.handler_name,
        opening_balance: Number(s.opening_balance) || 0,
        total_credit:    Number(s.total_credit)  || 0,
        total_debit:     Number(s.total_debit)   || 0,
        txn_count:       Number(s.txn_count)     || 0,
        balance:         balanceMap[s.handler_name] ?? 0,
      })),
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
