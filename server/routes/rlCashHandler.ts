import { Router } from 'express';
import { getAll, getOne } from '../db/database';
import { friendlyError } from '../lib/userError';

const router = Router();

// TransportBook source tables that can generate cash transactions
const TB_SOURCES = ['rl_expenses', 'rl_diesel_credit'];

// GET /rl/cash-handler?handler=NAME&month=YYYY-MM
router.get('/', async (req, res) => {
  try {
    const { handler, month } = req.query as Record<string, string>;

    const params: any[] = [TB_SOURCES];
    let where = `WHERE source_table = ANY($1)`;
    let idx = 2;

    if (handler) { where += ` AND handler_name=$${idx++}`; params.push(handler); }
    if (month)   { where += ` AND date LIKE $${idx++}`;    params.push(`${month}%`); }

    const [txns, handlerList, summary] = await Promise.all([
      getAll(`SELECT * FROM imprest_transactions ${where} ORDER BY date DESC, id DESC`, params),
      getAll(
        `SELECT DISTINCT handler_name FROM imprest_transactions WHERE source_table=ANY($1) ORDER BY handler_name`,
        [TB_SOURCES]
      ),
      getAll(
        `SELECT
           it.handler_name,
           ih.opening_balance,
           COALESCE(SUM(it.credit),0)::float  AS total_credit,
           COALESCE(SUM(it.debit),0)::float   AS total_debit,
           COUNT(*)::int                      AS txn_count
         FROM imprest_transactions it
         LEFT JOIN imprest_handlers ih ON ih.handler_name=it.handler_name
         WHERE it.source_table=ANY($1)
         GROUP BY it.handler_name, ih.opening_balance
         ORDER BY it.handler_name`,
        [TB_SOURCES]
      ),
    ]);

    // Compute running balance per handler (opening + credits - debits for ALL time, not just filter)
    const allTimeTotals = await getAll(
      `SELECT
         it.handler_name,
         COALESCE(ih.opening_balance,0)::float   AS opening_balance,
         COALESCE(SUM(it.credit),0)::float       AS total_credit,
         COALESCE(SUM(it.debit),0)::float        AS total_debit
       FROM imprest_transactions it
       LEFT JOIN imprest_handlers ih ON ih.handler_name=it.handler_name
       WHERE it.source_table=ANY($1)
       GROUP BY it.handler_name, ih.opening_balance`,
      [TB_SOURCES]
    );

    const balanceMap: Record<string, number> = {};
    for (const r of allTimeTotals) {
      const ob = Number(r.opening_balance) || 0;
      balanceMap[r.handler_name] = ob + Number(r.total_credit) - Number(r.total_debit);
    }

    res.json({
      transactions: txns.map((t: any) => ({
        ...t,
        debit:  Number(t.debit)  || 0,
        credit: Number(t.credit) || 0,
      })),
      handlers: handlerList.map((h: any) => h.handler_name),
      summary: summary.map((s: any) => ({
        handler_name:  s.handler_name,
        opening_balance: Number(s.opening_balance) || 0,
        total_credit:  Number(s.total_credit)  || 0,
        total_debit:   Number(s.total_debit)   || 0,
        txn_count:     Number(s.txn_count)     || 0,
        balance:       balanceMap[s.handler_name] ?? 0,
      })),
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
