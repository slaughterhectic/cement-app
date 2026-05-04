import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';

const router = Router();

// GET /freight-parties — list with summary
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT fp.*,
        COALESCE((SELECT SUM(pu.bags * COALESCE(pu.freight_rate, 0)) FROM purchases pu WHERE pu.freight_party_id = fp.id), 0) AS total_freight,
        COALESCE((SELECT SUM(amount) FROM freight_party_payments WHERE freight_party_id = fp.id AND COALESCE(payment_type,'paid')='paid'), 0) AS total_paid,
        COALESCE((SELECT SUM(amount) FROM freight_party_payments WHERE freight_party_id = fp.id AND payment_type='received'), 0) AS total_received,
        COALESCE((SELECT COUNT(*) FROM purchases WHERE freight_party_id = fp.id), 0) AS purchase_count
      FROM freight_parties fp ORDER BY fp.name
    `);
    res.json(rows.map((r: any) => ({
      ...r,
      total_freight: Number(r.total_freight),
      total_paid: Number(r.total_paid),
      total_received: Number(r.total_received),
      purchase_count: Number(r.purchase_count),
      // We owe them total_freight + opening_balance (debit), reduced by what we paid
      // and any refunds they sent back.
      outstanding: Number(r.opening_balance || 0) + Number(r.total_freight) - Number(r.total_paid) - Number(r.total_received),
    })));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /freight-parties/:id/ledger
router.get('/:id/ledger', async (req, res) => {
  try {
    const fp = await getOne('SELECT * FROM freight_parties WHERE id=$1', [req.params.id]);
    if (!fp) return res.status(404).json({ error: 'Freight party not found' });

    // Freight charges — purchases routed through this freight party
    const charges = await getAll(`
      SELECT pu.date,
        ('Freight on ' || cb.name
          || CASE WHEN COALESCE(NULLIF(TRIM(pu.truck_number),''),'') <> '' THEN ' (' || pu.truck_number || ')' ELSE '' END
        ) AS particulars,
        pu.bags AS qty,
        COALESCE(pu.freight_rate, 0) AS rate,
        (pu.bags * COALESCE(pu.freight_rate, 0)) AS amount,
        'freight' AS entry_type,
        pu.id AS source_id,
        NULL AS mode, NULL AS bank_name, NULL AS remarks
      FROM purchases pu
      JOIN cement_brands cb ON pu.brand_id = cb.id
      WHERE pu.freight_party_id = $1 AND COALESCE(pu.freight_rate, 0) > 0 AND pu.bags > 0
    `, [req.params.id]);

    const payments = await getAll(`
      SELECT id AS source_id, date, amount,
        ('Payment - ' || COALESCE(mode, 'bank')
          || CASE WHEN bank_name IS NOT NULL THEN ' (' || bank_name || ')' ELSE '' END
          || CASE WHEN payment_type='received' THEN ' [Received]' ELSE ' [Paid to them]' END
        ) AS particulars,
        0 AS qty, 0 AS rate, mode, bank_name, cash_handler, remarks,
        'payment' AS entry_type,
        COALESCE(payment_type, 'paid') AS payment_type
      FROM freight_party_payments WHERE freight_party_id=$1
    `, [req.params.id]);

    const all = [...charges, ...payments]
      .sort((a: any, b: any) => a.date.localeCompare(b.date) || (Number(a.source_id) - Number(b.source_id)));

    let balance = Number(fp.opening_balance || 0);
    const ledger = all.map((e: any) => {
      const amt = Number(e.amount);
      if (e.entry_type === 'payment') {
        // Both 'paid' (we paid them) and 'received' (refund) reduce what we owe
        balance -= amt;
      } else {
        balance += amt;
      }
      return { ...e, amount: amt, balance };
    });

    const totalFreight = charges.reduce((s: number, r: any) => s + Number(r.amount), 0);
    const totalPaid = payments.filter((r: any) => (r.payment_type || 'paid') === 'paid').reduce((s: number, r: any) => s + Number(r.amount), 0);
    const totalReceived = payments.filter((r: any) => r.payment_type === 'received').reduce((s: number, r: any) => s + Number(r.amount), 0);

    res.json({
      freight_party: fp,
      ledger,
      totalFreight,
      totalPaid,
      totalReceived,
      outstanding: Number(fp.opening_balance || 0) + totalFreight - totalPaid - totalReceived,
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /freight-parties
router.post('/', async (req, res) => {
  try {
    const { name, phone, opening_balance } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const row = await getOne(
      'INSERT INTO freight_parties (name, phone, opening_balance) VALUES ($1,$2,$3) RETURNING *',
      [name.trim(), phone?.trim() || null, Number(opening_balance) || 0]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /freight-parties/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, opening_balance, is_active } = req.body;
    const row = await getOne(
      'UPDATE freight_parties SET name=$1, phone=$2, opening_balance=$3, is_active=$4 WHERE id=$5 RETURNING *',
      [name.trim(), phone?.trim() || null, Number(opening_balance) || 0, is_active ?? 1, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Freight party not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /freight-parties/:id
router.delete('/:id', async (req, res) => {
  try {
    const used = await getOne('SELECT 1 FROM purchases WHERE freight_party_id=$1 LIMIT 1', [req.params.id]);
    if (used) return res.status(400).json({ error: 'Freight party is used in purchases — cannot delete' });
    await query('DELETE FROM freight_party_payments WHERE freight_party_id=$1', [req.params.id]);
    await query('DELETE FROM freight_parties WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// POST /freight-parties/:id/payments
router.post('/:id/payments', async (req: any, res) => {
  try {
    const { date, amount, mode, bank_name, cash_handler, remarks, payment_type } = req.body;
    if (!date || !amount) return res.status(400).json({ error: 'date and amount required' });

    // All non-admin entries go through admin approval.
    if (req.user?.role !== 'admin') {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const payload = { ...req.body, freight_party_id: Number(req.params.id) };
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name, source)
         VALUES ('freight_party_payment', $1::jsonb, $2, $3, 'cementbook') RETURNING id`,
        [JSON.stringify(payload), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    const normalizedMode = mode || 'cash';
    const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
    const bank    = normalizedMode === 'bank' ? (bank_name    || null) : null;
    const pType   = payment_type || 'paid';

    const row = await getOne(
      `INSERT INTO freight_party_payments (date, freight_party_id, amount, mode, bank_name, cash_handler, remarks, payment_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [date, req.params.id, Number(amount), normalizedMode, bank, handler, remarks || null, pType]
    );

    const fp = await getOne(`SELECT name FROM freight_parties WHERE id=$1`, [req.params.id]);
    await syncImprestForCashTxn({
      sourceTable: 'freight_party_payments',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      direction: pType === 'received' ? 'credit' : 'debit',
      particulars: `Freight ${pType === 'received' ? 'receipt' : 'payment'} — ${fp?.name ?? 'Freight party #' + req.params.id}`,
      narration: remarks || null,
    });

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /freight-parties/:id/payments/:pid (admin only)
router.delete('/:id/payments/:pid', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await deleteImprestForSource('freight_party_payments', Number(req.params.pid));
    await query('DELETE FROM freight_party_payments WHERE id=$1 AND freight_party_id=$2', [req.params.pid, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
