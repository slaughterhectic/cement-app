import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

// GET /rl/invoices
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(
      `SELECT * FROM rl_invoices ORDER BY invoice_number DESC`
    );
    res.json(rows.map((r: any) => ({
      ...r,
      invoice_amount: Number(r.invoice_amount) || 0,
      received_amount: Number(r.received_amount) || 0,
      tds_amount: Number(r.tds_amount) || 0,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /rl/invoices
router.post('/', async (req, res) => {
  try {
    const {
      invoice_number, invoice_date, invoice_amount, payment_receive_date,
      received_amount, tds_amount, status, remarks,
    } = req.body;

    if (!invoice_number?.trim()) return res.status(400).json({ error: 'Invoice number is required' });

    const invAmt = Number(invoice_amount) || 0;
    const recAmt = Number(received_amount) || 0;
    const tdsAmt = Number(tds_amount) || 0;

    // Auto-compute status if not provided
    let computedStatus = status || 'pending';
    if (!status) {
      if (recAmt >= invAmt * 0.98 && invAmt > 0) computedStatus = 'done';
      else if (recAmt > 0) computedStatus = 'partial';
      else computedStatus = 'pending';
    }

    const row = await getOne(
      `INSERT INTO rl_invoices
        (invoice_number, invoice_date, invoice_amount, payment_receive_date,
         received_amount, tds_amount, status, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        invoice_number.trim(),
        invoice_date || null,
        invAmt,
        payment_receive_date || null,
        recAmt,
        tdsAmt,
        computedStatus,
        remarks?.trim() || null,
      ]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// PUT /rl/invoices/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      invoice_number, invoice_date, invoice_amount, payment_receive_date,
      received_amount, tds_amount, status, remarks,
    } = req.body;

    if (!invoice_number?.trim()) return res.status(400).json({ error: 'Invoice number is required' });

    const invAmt = Number(invoice_amount) || 0;
    const recAmt = Number(received_amount) || 0;
    const tdsAmt = Number(tds_amount) || 0;

    let computedStatus = status || 'pending';
    if (!status) {
      if (recAmt >= invAmt * 0.98 && invAmt > 0) computedStatus = 'done';
      else if (recAmt > 0) computedStatus = 'partial';
      else computedStatus = 'pending';
    }

    const row = await getOne(
      `UPDATE rl_invoices SET
        invoice_number=$1, invoice_date=$2, invoice_amount=$3, payment_receive_date=$4,
        received_amount=$5, tds_amount=$6, status=$7, remarks=$8
       WHERE id=$9 RETURNING *`,
      [
        invoice_number.trim(),
        invoice_date || null,
        invAmt,
        payment_receive_date || null,
        recAmt,
        tdsAmt,
        computedStatus,
        remarks?.trim() || null,
        req.params.id,
      ]
    );
    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /rl/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM rl_invoices WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
