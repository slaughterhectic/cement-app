import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { canEditTransport } from '../lib/transportAuth';

const router = Router();

const GSTR_STATUSES = new Set(['pending', 'filed', 'mismatch']);
const ITC_STATUSES = new Set(['not_claimed', 'claimed_by_party', 'reconciled', 'disputed']);

function normGstr(v: any, def = 'pending'): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return GSTR_STATUSES.has(s) ? s : def;
}
function normItc(v: any, def = 'not_claimed'): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return ITC_STATUSES.has(s) ? s : def;
}

// GET /rl/invoices?company=acc|jk (optional filter)
router.get('/', async (req, res) => {
  try {
    const company = typeof req.query.company === 'string' ? req.query.company.trim().toLowerCase() : '';
    const where = company === 'acc' || company === 'jk' ? `WHERE company=$1` : '';
    const params = where ? [company] : [];
    const rows = await getAll(
      `SELECT * FROM rl_invoices ${where} ORDER BY
        CASE WHEN invoice_number ~ '/[0-9]+$'
          THEN CAST(SPLIT_PART(invoice_number, '/', -1) AS INTEGER)
          ELSE 0 END ASC,
        invoice_number ASC`,
      params
    );
    res.json(rows.map((r: any) => ({
      ...r,
      invoice_amount: Number(r.invoice_amount) || 0,
      received_amount: Number(r.received_amount) || 0,
      tds_amount: Number(r.tds_amount) || 0,
    })));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /rl/invoices/billing-summary?company=acc|jk[&month=YYYY-MM]
// Auto-shifts trip freight totals into the billing view: each company only sees its own
// trips (rl_trips.company), and as invoices are raised "Yet to bill" shrinks toward zero.
router.get('/billing-summary', async (req, res) => {
  try {
    const company = (typeof req.query.company === 'string' ? req.query.company.trim().toLowerCase() : '') || 'acc';
    if (company !== 'acc' && company !== 'jk') return res.status(400).json({ error: "company must be 'acc' or 'jk'" });
    const month = typeof req.query.month === 'string' && req.query.month.trim() ? req.query.month.trim() : null;

    const tripParams: any[] = [company];
    let tripWhere = `WHERE company = $1`;
    if (month) {
      tripParams.push(`${month}%`);
      tripWhere += ` AND date LIKE $${tripParams.length}`;
    }

    const tripRow = await getOne(
      `SELECT COALESCE(SUM(qty * acc_freight_rate), 0)::float AS total
         FROM rl_trips ${tripWhere}`,
      tripParams
    );

    const invoiceParams: any[] = [company];
    let invoiceWhere = `WHERE company = $1`;
    if (month) {
      invoiceParams.push(`${month}%`);
      invoiceWhere += ` AND COALESCE(invoice_date,'') LIKE $${invoiceParams.length}`;
    }
    const invoiceRow = await getOne(
      `SELECT
         COALESCE(SUM(invoice_amount), 0)::float  AS invoiced,
         COALESCE(SUM(received_amount), 0)::float AS received,
         COALESCE(SUM(tds_amount), 0)::float      AS tds
       FROM rl_invoices ${invoiceWhere}`,
      invoiceParams
    );

    const tripAccTotal = Number(tripRow?.total) || 0;
    const invoiced = Number(invoiceRow?.invoiced) || 0;
    const received = Number(invoiceRow?.received) || 0;
    const tds = Number(invoiceRow?.tds) || 0;

    res.json({
      company,
      month,
      trip_acc_total: tripAccTotal,
      invoiced,
      received,
      tds,
      pending_to_invoice: Math.max(0, tripAccTotal - invoiced),
      pending_payment: Math.max(0, invoiced - received),
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /rl/invoices/compliance-summary — aggregate counts for dashboard
router.get('/compliance-summary', async (req, res) => {
  try {
    const { period } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (period) {
      conditions.push(`(gstr1_period = $${idx} OR gstr3b_period = $${idx} OR itc_period = $${idx})`);
      params.push(period);
      idx++;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [totals] = await getAll(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE gstr1_status = 'filed') AS gstr1_filed,
         COUNT(*) FILTER (WHERE gstr1_status = 'mismatch') AS gstr1_mismatch,
         COUNT(*) FILTER (WHERE gstr3b_status = 'filed') AS gstr3b_filed,
         COUNT(*) FILTER (WHERE gstr3b_status = 'mismatch') AS gstr3b_mismatch,
         COUNT(*) FILTER (WHERE itc_status = 'claimed_by_party') AS itc_claimed,
         COUNT(*) FILTER (WHERE itc_status = 'reconciled') AS itc_reconciled,
         COUNT(*) FILTER (WHERE itc_status = 'disputed') AS itc_disputed
       FROM rl_invoices ${where}`,
      params
    );
    res.json({
      total: Number(totals.total) || 0,
      gstr1_filed: Number(totals.gstr1_filed) || 0,
      gstr1_mismatch: Number(totals.gstr1_mismatch) || 0,
      gstr3b_filed: Number(totals.gstr3b_filed) || 0,
      gstr3b_mismatch: Number(totals.gstr3b_mismatch) || 0,
      itc_claimed: Number(totals.itc_claimed) || 0,
      itc_reconciled: Number(totals.itc_reconciled) || 0,
      itc_disputed: Number(totals.itc_disputed) || 0,
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /rl/invoices
router.post('/', async (req, res) => {
  try {
    const {
      invoice_number, invoice_date, invoice_amount, payment_receive_date,
      received_amount, tds_amount, status, remarks, company,
      gstr1_status, gstr1_period, gstr3b_status, gstr3b_period,
      itc_status, itc_period, compliance_remarks,
      basic_amount, gst_amount, misc_amount, misc_remarks,
    } = req.body;

    if (!invoice_number?.trim()) return res.status(400).json({ error: 'Invoice number is required' });
    const co = (typeof company === 'string' ? company.trim().toLowerCase() : '') || 'acc';
    if (co !== 'acc' && co !== 'jk') return res.status(400).json({ error: "company must be 'acc' or 'jk'" });

    // Caller can either send a single invoice_amount or the bifurcation. If basic+gst
    // (and optional misc) are provided we sum them; otherwise we trust invoice_amount.
    let basicAmt = Number(basic_amount);
    let gstAmt   = Number(gst_amount);
    const miscAmt = Number(misc_amount) || 0;
    if (!Number.isFinite(basicAmt)) basicAmt = 0;
    if (!Number.isFinite(gstAmt))   gstAmt = 0;
    const haveBifurcation = basicAmt > 0 || gstAmt > 0 || miscAmt > 0;
    const invAmt = haveBifurcation ? (basicAmt + gstAmt + miscAmt) : (Number(invoice_amount) || 0);
    const recAmt = Number(received_amount) || 0;
    const tdsAmt = Number(tds_amount) || 0;

    let computedStatus = status || 'pending';
    if (!status) {
      if (recAmt >= invAmt * 0.98 && invAmt > 0) computedStatus = 'done';
      else if (recAmt > 0) computedStatus = 'partial';
      else computedStatus = 'pending';
    }

    const row = await getOne(
      `INSERT INTO rl_invoices
        (invoice_number, invoice_date, invoice_amount, payment_receive_date,
         received_amount, tds_amount, status, remarks, company,
         gstr1_status, gstr1_period, gstr3b_status, gstr3b_period,
         itc_status, itc_period, compliance_remarks,
         basic_amount, gst_amount, misc_amount, misc_remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
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
        co,
        normGstr(gstr1_status),
        gstr1_period?.trim() || null,
        normGstr(gstr3b_status),
        gstr3b_period?.trim() || null,
        normItc(itc_status),
        itc_period?.trim() || null,
        compliance_remarks?.trim() || null,
        haveBifurcation ? basicAmt : null,
        haveBifurcation ? gstAmt : null,
        miscAmt,
        misc_remarks?.trim() || null,
      ]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /rl/invoices/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      invoice_number, invoice_date, invoice_amount, payment_receive_date,
      received_amount, tds_amount, status, remarks, company,
      gstr1_status, gstr1_period, gstr3b_status, gstr3b_period,
      itc_status, itc_period, compliance_remarks,
      basic_amount, gst_amount, misc_amount, misc_remarks,
    } = req.body;

    if (!invoice_number?.trim()) return res.status(400).json({ error: 'Invoice number is required' });

    // Preserve existing company if the client didn't send one (older edit forms).
    const existing = await getOne('SELECT company FROM rl_invoices WHERE id=$1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    const co = (typeof company === 'string' ? company.trim().toLowerCase() : '') || existing.company || 'acc';
    if (co !== 'acc' && co !== 'jk') return res.status(400).json({ error: "company must be 'acc' or 'jk'" });

    let basicAmt = Number(basic_amount);
    let gstAmt   = Number(gst_amount);
    const miscAmt = Number(misc_amount) || 0;
    if (!Number.isFinite(basicAmt)) basicAmt = 0;
    if (!Number.isFinite(gstAmt))   gstAmt = 0;
    const haveBifurcation = basicAmt > 0 || gstAmt > 0 || miscAmt > 0;
    const invAmt = haveBifurcation ? (basicAmt + gstAmt + miscAmt) : (Number(invoice_amount) || 0);
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
        received_amount=$5, tds_amount=$6, status=$7, remarks=$8, company=$9,
        gstr1_status=$10, gstr1_period=$11, gstr3b_status=$12, gstr3b_period=$13,
        itc_status=$14, itc_period=$15, compliance_remarks=$16,
        basic_amount=$17, gst_amount=$18, misc_amount=$19, misc_remarks=$20
       WHERE id=$21 RETURNING *`,
      [
        invoice_number.trim(),
        invoice_date || null,
        invAmt,
        payment_receive_date || null,
        recAmt,
        tdsAmt,
        computedStatus,
        remarks?.trim() || null,
        co,
        normGstr(gstr1_status),
        gstr1_period?.trim() || null,
        normGstr(gstr3b_status),
        gstr3b_period?.trim() || null,
        normItc(itc_status),
        itc_period?.trim() || null,
        compliance_remarks?.trim() || null,
        haveBifurcation ? basicAmt : null,
        haveBifurcation ? gstAmt : null,
        miscAmt,
        misc_remarks?.trim() || null,
        req.params.id,
      ]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PATCH /rl/invoices/:id/compliance — inline edit compliance fields only
router.patch('/:id/compliance', async (req, res) => {
  try {
    const {
      gstr1_status, gstr1_period, gstr3b_status, gstr3b_period,
      itc_status, itc_period, compliance_remarks,
    } = req.body;

    const existing = await getOne('SELECT * FROM rl_invoices WHERE id=$1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });

    const row = await getOne(
      `UPDATE rl_invoices SET
        gstr1_status=$1, gstr1_period=$2, gstr3b_status=$3, gstr3b_period=$4,
        itc_status=$5, itc_period=$6, compliance_remarks=$7
       WHERE id=$8 RETURNING *`,
      [
        normGstr(gstr1_status, existing.gstr1_status || 'pending'),
        gstr1_period?.trim() || existing.gstr1_period || null,
        normGstr(gstr3b_status, existing.gstr3b_status || 'pending'),
        gstr3b_period?.trim() || existing.gstr3b_period || null,
        normItc(itc_status, existing.itc_status || 'not_claimed'),
        itc_period?.trim() || existing.itc_period || null,
        compliance_remarks?.trim() ?? existing.compliance_remarks ?? null,
        req.params.id,
      ]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// Helper: rebuild rl_invoices.received_amount + payment_receive_date + status from
// the per-invoice payment ledger. Called whenever a payment is added or deleted.
async function recomputeInvoiceFromPayments(invoiceId: number) {
  const tot = await getOne(
    `SELECT COALESCE(SUM(amount),0)::float AS total, MAX(date) AS last_date
     FROM rl_invoice_payments WHERE invoice_id=$1`,
    [invoiceId]
  );
  const inv = await getOne('SELECT invoice_amount FROM rl_invoices WHERE id=$1', [invoiceId]);
  const invAmt = Number(inv?.invoice_amount) || 0;
  const recAmt = Number(tot?.total) || 0;
  let status: 'pending' | 'partial' | 'done' = 'pending';
  if (invAmt > 0 && recAmt >= invAmt * 0.98) status = 'done';
  else if (recAmt > 0) status = 'partial';
  await query(
    `UPDATE rl_invoices SET received_amount=$1, payment_receive_date=$2, status=$3 WHERE id=$4`,
    [recAmt, tot?.last_date || null, status, invoiceId]
  );
}

// GET /rl/invoices/:id/payments
router.get('/:id/payments', async (req, res) => {
  try {
    const rows = await getAll(
      `SELECT * FROM rl_invoice_payments WHERE invoice_id=$1 ORDER BY date ASC, id ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /rl/invoices/:id/payments — add a payment receipt
router.post('/:id/payments', async (req, res) => {
  try {
    const { date, amount, mode, bank_name, reference, remarks } = req.body;
    if (!date || !amount) return res.status(400).json({ error: 'date and amount required' });

    if (!await canEditTransport(req)) {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const payload = { ...req.body, invoice_id: Number(req.params.id) };
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name, source)
         VALUES ('rl_invoice_payment', $1::jsonb, $2, $3, 'transportbook') RETURNING id`,
        [JSON.stringify(payload), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    const m = mode === 'cash' ? 'cash' : 'bank';
    const row = await getOne(
      `INSERT INTO rl_invoice_payments (invoice_id, date, amount, mode, bank_name, reference, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, date, Number(amount), m, m === 'bank' ? (bank_name || null) : null, reference?.trim() || null, remarks?.trim() || null]
    );
    await recomputeInvoiceFromPayments(Number(req.params.id));
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id/payments/:pid', async (req, res) => {
  try {
    if (!await canEditTransport(req)) return res.status(403).json({ error: 'Admin only' });
    await query('DELETE FROM rl_invoice_payments WHERE id=$1 AND invoice_id=$2', [req.params.pid, req.params.id]);
    await recomputeInvoiceFromPayments(Number(req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /rl/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM rl_invoices WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
