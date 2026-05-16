import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { canEditTransport } from '../lib/transportAuth';

const router = Router();

// GET /rl/banks — list with computed running balance (opening + credits − debits)
// Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD to scope credits/debits to a date range
router.get('/', async (req, res) => {
  try {
    const fromDate = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
    const toDate   = typeof req.query.to   === 'string' && req.query.to   ? req.query.to   : null;
    const hasRange = fromDate && toDate;

    const rows = hasRange
      ? await getAll(`
          SELECT b.*,
            COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE bank_id=b.id AND type='credit' AND date < $1), 0)::float AS pre_credits,
            COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE bank_id=b.id AND type='debit'  AND date < $1), 0)::float AS pre_debits,
            COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE bank_id=b.id AND type='credit' AND date >= $1 AND date <= $2), 0)::float AS range_credits,
            COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE bank_id=b.id AND type='debit'  AND date >= $1 AND date <= $2), 0)::float AS range_debits,
            COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE bank_id=b.id AND type='credit'), 0)::float AS total_credits,
            COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE bank_id=b.id AND type='debit'),  0)::float AS total_debits,
            COALESCE((SELECT COUNT(*) FROM rl_bank_transactions WHERE bank_id=b.id), 0)::int AS txn_count
          FROM rl_banks b
          ORDER BY b.is_active DESC, b.name
        `, [fromDate, toDate])
      : await getAll(`
          SELECT b.*,
            COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE bank_id=b.id AND type='credit'), 0)::float AS total_credits,
            COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE bank_id=b.id AND type='debit'),  0)::float AS total_debits,
            COALESCE((SELECT COUNT(*) FROM rl_bank_transactions WHERE bank_id=b.id), 0)::int AS txn_count
          FROM rl_banks b
          ORDER BY b.is_active DESC, b.name
        `);

    res.json(rows.map((r: any) => {
      const ob  = Number(r.opening_balance) || 0;
      const tc  = Number(r.total_credits)   || 0;
      const td  = Number(r.total_debits)    || 0;
      if (hasRange) {
        const preC = Number(r.pre_credits)   || 0;
        const preD = Number(r.pre_debits)    || 0;
        const ranC = Number(r.range_credits) || 0;
        const ranD = Number(r.range_debits)  || 0;
        const rangeOpening = ob + preC - preD;
        return {
          ...r,
          opening_balance: ob,
          range_opening: rangeOpening,
          total_credits: ranC,
          total_debits: ranD,
          balance: rangeOpening + ranC - ranD,
          all_time_balance: ob + tc - td,
          txn_count: Number(r.txn_count) || 0,
        };
      }
      return {
        ...r,
        opening_balance: ob,
        total_credits: tc,
        total_debits: td,
        balance: ob + tc - td,
        txn_count: Number(r.txn_count) || 0,
      };
    }));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /rl/banks/summary — single number for the dashboard closing balance card.
router.get('/summary', async (_req, res) => {
  try {
    const row = await getOne(`
      SELECT
        COALESCE((SELECT SUM(opening_balance) FROM rl_banks WHERE is_active=1), 0)::float AS opening,
        COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE type='credit'), 0)::float AS credits,
        COALESCE((SELECT SUM(amount) FROM rl_bank_transactions WHERE type='debit'),  0)::float AS debits,
        (SELECT COUNT(*) FROM rl_banks WHERE is_active=1)::int AS active_banks
    `);
    const opening = Number(row?.opening) || 0;
    const credits = Number(row?.credits) || 0;
    const debits  = Number(row?.debits)  || 0;
    res.json({
      opening,
      credits,
      debits,
      closing: opening + credits - debits,
      active_banks: Number(row?.active_banks) || 0,
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /rl/banks/:id/statement — paginated bank statement with running balance
router.get('/:id/statement', async (req, res) => {
  try {
    const bank = await getOne('SELECT * FROM rl_banks WHERE id=$1', [req.params.id]);
    if (!bank) return res.status(404).json({ error: 'Bank not found' });

    const txns = await getAll(
      `SELECT * FROM rl_bank_transactions WHERE bank_id=$1 ORDER BY date ASC, id ASC`,
      [req.params.id]
    );

    let running = Number(bank.opening_balance) || 0;
    const ledger = txns.map((t: any) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'credit') running += amt; else running -= amt;
      return { ...t, amount: amt, balance: running };
    });

    res.json({
      bank: { ...bank, opening_balance: Number(bank.opening_balance) || 0 },
      ledger,
      closing: running,
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, opening_balance } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Bank name is required' });
    const row = await getOne(
      'INSERT INTO rl_banks (name, opening_balance) VALUES ($1,$2) RETURNING *',
      [name.trim(), Number(opening_balance) || 0]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, opening_balance, is_active } = req.body;
    const row = await getOne(
      'UPDATE rl_banks SET name=$1, opening_balance=$2, is_active=$3 WHERE id=$4 RETURNING *',
      [name.trim(), Number(opening_balance) || 0, is_active ?? 1, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Bank not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!await canEditTransport(req)) return res.status(403).json({ error: 'Admin only' });
    await query('DELETE FROM rl_banks WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// POST /rl/banks/:id/transactions — manual credit/debit entry
router.post('/:id/transactions', async (req, res) => {
  try {
    const { date, type, amount, particulars, remarks } = req.body;
    if (!date || !amount) return res.status(400).json({ error: 'date and amount required' });
    if (type !== 'credit' && type !== 'debit') return res.status(400).json({ error: "type must be 'credit' or 'debit'" });

    if (!await canEditTransport(req)) {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const payload = { ...req.body, bank_id: Number(req.params.id) };
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name, source)
         VALUES ('rl_bank_txn', $1::jsonb, $2, $3, 'transportbook') RETURNING id`,
        [JSON.stringify(payload), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    const row = await getOne(
      `INSERT INTO rl_bank_transactions (bank_id, date, type, amount, particulars, remarks, source_table)
       VALUES ($1,$2,$3,$4,$5,$6,'manual') RETURNING *`,
      [req.params.id, date, type, Number(amount), particulars?.trim() || null, remarks?.trim() || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /rl/banks/:id/transactions/:txId — edit a manual transaction (source_table='manual' only)
router.put('/:id/transactions/:txId', async (req, res) => {
  try {
    if (!await canEditTransport(req)) return res.status(403).json({ error: 'Admin only' });
    const { date, type, amount, particulars, remarks } = req.body;
    if (!date || !amount) return res.status(400).json({ error: 'date and amount required' });
    if (type !== 'credit' && type !== 'debit') return res.status(400).json({ error: "type must be 'credit' or 'debit'" });
    const row = await getOne(
      `UPDATE rl_bank_transactions
         SET date=$1, type=$2, amount=$3, particulars=$4, remarks=$5
       WHERE id=$6 AND bank_id=$7 AND source_table='manual'
       RETURNING *`,
      [date, type, Number(amount), particulars?.trim() || null, remarks?.trim() || null, req.params.txId, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Transaction not found or not editable' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id/transactions/:txId', async (req, res) => {
  try {
    if (!await canEditTransport(req)) return res.status(403).json({ error: 'Admin only' });
    await query(
      "DELETE FROM rl_bank_transactions WHERE id=$1 AND bank_id=$2 AND source_table='manual'",
      [req.params.txId, req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
