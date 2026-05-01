import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';

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
      `SELECT * FROM rl_invoices ${where} ORDER BY invoice_number DESC`,
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
    } = req.body;

    if (!invoice_number?.trim()) return res.status(400).json({ error: 'Invoice number is required' });
    const co = (typeof company === 'string' ? company.trim().toLowerCase() : '') || 'acc';
    if (co !== 'acc' && co !== 'jk') return res.status(400).json({ error: "company must be 'acc' or 'jk'" });

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
      `INSERT INTO rl_invoices
        (invoice_number, invoice_date, invoice_amount, payment_receive_date,
         received_amount, tds_amount, status, remarks, company,
         gstr1_status, gstr1_period, gstr3b_status, gstr3b_period,
         itc_status, itc_period, compliance_remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
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
    } = req.body;

    if (!invoice_number?.trim()) return res.status(400).json({ error: 'Invoice number is required' });

    // Preserve existing company if the client didn't send one (older edit forms).
    const existing = await getOne('SELECT company FROM rl_invoices WHERE id=$1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    const co = (typeof company === 'string' ? company.trim().toLowerCase() : '') || existing.company || 'acc';
    if (co !== 'acc' && co !== 'jk') return res.status(400).json({ error: "company must be 'acc' or 'jk'" });

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
        received_amount=$5, tds_amount=$6, status=$7, remarks=$8, company=$9,
        gstr1_status=$10, gstr1_period=$11, gstr3b_status=$12, gstr3b_period=$13,
        itc_status=$14, itc_period=$15, compliance_remarks=$16
       WHERE id=$17 RETURNING *`,
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

// DELETE /rl/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM rl_invoices WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
