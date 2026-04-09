import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`SELECT * FROM loans ORDER BY start_date DESC`);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { lender_name, principal, interest_rate, emi_amount, start_date, tenure_months, outstanding_principal, remarks } = req.body;
  try {
    const row = await getOne(
      `INSERT INTO loans (lender_name, principal, interest_rate, emi_amount, start_date, tenure_months, outstanding_principal, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [lender_name, principal, interest_rate, emi_amount || null, start_date, tenure_months || null, outstanding_principal ?? principal, remarks || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { lender_name, principal, interest_rate, emi_amount, start_date, tenure_months, outstanding_principal, remarks } = req.body;
  try {
    const row = await getOne(
      `UPDATE loans SET lender_name=$1, principal=$2, interest_rate=$3, emi_amount=$4, start_date=$5, tenure_months=$6, outstanding_principal=$7, remarks=$8
       WHERE id=$9 RETURNING *`,
      [lender_name, principal, interest_rate, emi_amount || null, start_date, tenure_months || null, outstanding_principal ?? principal, remarks || null, req.params.id]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM loans WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
