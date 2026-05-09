import { Router } from 'express';
import pool, { getAll } from '../db/database';
import { friendlyError } from '../lib/userError';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';

const router = Router();

// GET /api/loan-repayments  (optionally ?loan_id=)
router.get('/', async (req, res) => {
  try {
    const loanId = req.query.loan_id ? Number(req.query.loan_id) : null;
    const rows = loanId
      ? await getAll(
          `SELECT lr.*, l.lender_name FROM loan_repayments lr
           JOIN loans l ON l.id = lr.loan_id
           WHERE lr.loan_id = $1
           ORDER BY lr.date DESC, lr.id DESC`,
          [loanId]
        )
      : await getAll(
          `SELECT lr.*, l.lender_name FROM loan_repayments lr
           JOIN loans l ON l.id = lr.loan_id
           ORDER BY lr.date DESC, lr.id DESC`
        );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

// POST /api/loan-repayments
router.post('/', async (req, res) => {
  const { loan_id, date, amount, mode, bank_name, cash_handler, remarks } = req.body;
  if (!loan_id || !date || !amount) {
    return res.status(400).json({ error: 'loan_id, date and amount are required' });
  }
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'amount must be greater than 0' });
  const normalizedMode = mode === 'cash' ? 'cash' : 'bank';
  const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
  const bank = normalizedMode === 'bank' ? (bank_name || null) : null;

  const client = await pool.connect();
  let inserted: any;
  try {
    await client.query('BEGIN');
    const loan = (await client.query('SELECT id, lender_name, principal, outstanding_principal FROM loans WHERE id=$1 FOR UPDATE', [loan_id])).rows[0];
    if (!loan) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found' });
    }
    inserted = (await client.query(
      `INSERT INTO loan_repayments (loan_id, date, amount, mode, bank_name, cash_handler, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [loan_id, date, amt, normalizedMode, bank, handler, remarks || null]
    )).rows[0];
    const currentOutstanding = Number(loan.outstanding_principal ?? loan.principal);
    const newOutstanding = Math.max(0, currentOutstanding - amt);
    await client.query('UPDATE loans SET outstanding_principal=$1 WHERE id=$2', [newOutstanding, loan_id]);
    await client.query('COMMIT');
    inserted.lender_name = loan.lender_name;
  } catch (e: any) {
    await client.query('ROLLBACK');
    client.release();
    return res.status(500).json({ error: friendlyError(e) });
  }
  client.release();

  await syncImprestForCashTxn({
    sourceTable: 'loan_repayments',
    sourceId: inserted.id,
    mode: normalizedMode,
    cashHandler: handler,
    amount: amt,
    date,
    particulars: `Loan repayment — ${inserted.lender_name}`,
    narration: remarks || null,
  });

  res.json(inserted);
});

// DELETE /api/loan-repayments/:id  (admin only)
router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const repayment = (await client.query('SELECT * FROM loan_repayments WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!repayment) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Repayment not found' });
    }
    const loan = (await client.query('SELECT principal, outstanding_principal FROM loans WHERE id=$1 FOR UPDATE', [repayment.loan_id])).rows[0];
    if (loan) {
      const currentOutstanding = Number(loan.outstanding_principal ?? loan.principal);
      const restored = Math.min(Number(loan.principal), currentOutstanding + Number(repayment.amount));
      await client.query('UPDATE loans SET outstanding_principal=$1 WHERE id=$2', [restored, repayment.loan_id]);
    }
    await client.query('DELETE FROM loan_repayments WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    await deleteImprestForSource('loan_repayments', Number(req.params.id));
    res.json({ success: true });
  } catch (e: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: friendlyError(e) });
  } finally {
    client.release();
  }
});

// Per-loan summary used by Finance UI
router.get('/summary', async (_req, res) => {
  try {
    const rows = await getAll(
      `SELECT loan_id, COUNT(*)::int AS count, COALESCE(SUM(amount),0)::float AS total_repaid
       FROM loan_repayments GROUP BY loan_id`
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

// Monthly paid total with per-loan breakdown — used by Finance KPI
router.get('/monthly-paid', async (req, res) => {
  try {
    const { month } = req.query as { month?: string };
    const filter = month ? `WHERE to_char(lr.date::date, 'YYYY-MM') = $1` : '';
    const params = month ? [month] : [];

    const summary = await getAll(
      `SELECT COALESCE(SUM(amount),0)::float AS total_paid, COUNT(*)::int AS count
       FROM loan_repayments ${month ? `WHERE to_char(date::date, 'YYYY-MM') = $1` : ''}`,
      params
    );

    const breakdown = await getAll(
      `SELECT l.lender_name, lr.loan_id,
              COALESCE(SUM(lr.amount),0)::float AS paid,
              COUNT(*)::int AS count,
              MIN(lr.date) AS first_date,
              MAX(lr.date) AS last_date
       FROM loan_repayments lr
       JOIN loans l ON l.id = lr.loan_id
       ${filter}
       GROUP BY lr.loan_id, l.lender_name
       ORDER BY paid DESC`,
      params
    );

    const entries = await getAll(
      `SELECT lr.id, lr.date, lr.amount, lr.mode, lr.bank_name, lr.cash_handler, lr.remarks, l.lender_name, lr.loan_id
       FROM loan_repayments lr
       JOIN loans l ON l.id = lr.loan_id
       ${filter}
       ORDER BY lr.date DESC, lr.id DESC`,
      params
    );

    res.json({
      ...(summary[0] || { total_paid: 0, count: 0 }),
      breakdown,
      entries,
    });
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

export default router;
