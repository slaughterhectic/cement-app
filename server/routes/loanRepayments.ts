import { Router } from 'express';
import pool, { getAll, getOne } from '../db/database';

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
    res.status(500).json({ error: e.message });
  }
});

// POST /api/loan-repayments
router.post('/', async (req, res) => {
  const { loan_id, date, amount, mode, bank_name, remarks } = req.body;
  if (!loan_id || !date || !amount) {
    return res.status(400).json({ error: 'loan_id, date and amount are required' });
  }
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'amount must be greater than 0' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const loan = (await client.query('SELECT id, principal, outstanding_principal FROM loans WHERE id=$1 FOR UPDATE', [loan_id])).rows[0];
    if (!loan) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found' });
    }
    const inserted = (await client.query(
      `INSERT INTO loan_repayments (loan_id, date, amount, mode, bank_name, remarks)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [loan_id, date, amt, mode || 'bank', bank_name || null, remarks || null]
    )).rows[0];
    const currentOutstanding = Number(loan.outstanding_principal ?? loan.principal);
    const newOutstanding = Math.max(0, currentOutstanding - amt);
    await client.query('UPDATE loans SET outstanding_principal=$1 WHERE id=$2', [newOutstanding, loan_id]);
    await client.query('COMMIT');
    res.json(inserted);
  } catch (e: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
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
    res.json({ success: true });
  } catch (e: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

export default router;
