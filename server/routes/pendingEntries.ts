import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { friendlyError } from '../lib/userError';
import { syncImprestForCashTxn } from '../lib/imprestSync';
import { syncDieselDebitForSource } from '../lib/walletSync';

const router = Router();

async function hasTbApprove(userId: number): Promise<boolean> {
  const row = await getOne(
    `SELECT 1 FROM user_permissions WHERE user_id=$1 AND permission_name='tb_approve'`,
    [userId]
  );
  return !!row;
}

async function getStock(brandId: number, godownId?: number): Promise<number> {
  if (godownId) {
    const r = await getOne(`
      SELECT COALESCE((SELECT bags FROM godown_opening_stock WHERE brand_id=$1 AND godown_id=$2),0)
           + COALESCE((SELECT SUM(bags) FROM purchases       WHERE brand_id=$1 AND godown_id=$2),0)
           - COALESCE((SELECT SUM(bags) FROM sales           WHERE brand_id=$1 AND godown_id=$2),0) as stock
    `, [brandId, godownId]);
    return Number(r.stock);
  }
  const r = await getOne(`
    SELECT COALESCE((SELECT SUM(bags) FROM godown_opening_stock WHERE brand_id=$1),0)
         + COALESCE((SELECT SUM(bags) FROM purchases            WHERE brand_id=$1),0)
         - COALESCE((SELECT SUM(bags) FROM sales                WHERE brand_id=$1),0) as stock
  `, [brandId]);
  return Number(r.stock);
}

// GET /api/pending-entries
// Admin: all entries; User: own entries only; ?source= filters by book
router.get('/', async (req, res) => {
  try {
    const source = (req.query.source as string) || 'cementbook';
    let rows: any[];
    if (req.user!.role === 'admin') {
      rows = await getAll(`
        SELECT pe.*, u.display_name as created_by_name, rv.display_name as reviewed_by_name
        FROM pending_entries pe
        LEFT JOIN users u ON pe.created_by = u.id
        LEFT JOIN users rv ON pe.reviewed_by = rv.id
        WHERE pe.source = $1
        ORDER BY
          CASE pe.status WHEN 'pending' THEN 0 ELSE 1 END,
          pe.created_at DESC
      `, [source]);
    } else {
      rows = await getAll(`
        SELECT pe.*, u.display_name as created_by_name, rv.display_name as reviewed_by_name
        FROM pending_entries pe
        LEFT JOIN users u ON pe.created_by = u.id
        LEFT JOIN users rv ON pe.reviewed_by = rv.id
        WHERE pe.created_by = $1 AND pe.source = $2
        ORDER BY
          CASE pe.status WHEN 'pending' THEN 0 ELSE 1 END,
          pe.created_at DESC
      `, [req.user!.id, source]);
    }

    // Enrich entry_data with display names (batched — avoids N+1 round-trips to the DB)
    const partyIds = new Set<number>();
    const brandIds = new Set<number>();
    for (const pe of rows) {
      const data = pe.entry_data || {};
      if (pe.entry_type === 'sale') {
        const pid = data.party_id != null ? Number(data.party_id) : NaN;
        const bid = data.brand_id != null ? Number(data.brand_id) : NaN;
        if (Number.isFinite(pid)) partyIds.add(pid);
        if (Number.isFinite(bid)) brandIds.add(bid);
      } else if (pe.entry_type === 'purchase') {
        const sid = data.supplier_id != null ? Number(data.supplier_id) : NaN;
        const bid = data.brand_id != null ? Number(data.brand_id) : NaN;
        if (Number.isFinite(sid)) partyIds.add(sid);
        if (Number.isFinite(bid)) brandIds.add(bid);
      } else if (pe.entry_type === 'payment') {
        const pid = data.party_id != null ? Number(data.party_id) : NaN;
        if (Number.isFinite(pid)) partyIds.add(pid);
      }
    }

    const partyNames = new Map<number, string>();
    const brandNames = new Map<number, string>();
    try {
      if (partyIds.size > 0) {
        const pr = await getAll(`SELECT id, name FROM parties WHERE id = ANY($1::int[])`, [Array.from(partyIds)]);
        for (const p of pr) partyNames.set(Number(p.id), p.name);
      }
      if (brandIds.size > 0) {
        const br = await getAll(`SELECT id, name FROM cement_brands WHERE id = ANY($1::int[])`, [Array.from(brandIds)]);
        for (const b of br) brandNames.set(Number(b.id), b.name);
      }
    } catch (_) { /* enrich below with nulls if batch lookup fails */ }

    for (const pe of rows) {
      const data = pe.entry_data || {};
      try {
        if (pe.entry_type === 'sale') {
          const pid = data.party_id != null ? Number(data.party_id) : NaN;
          const bid = data.brand_id != null ? Number(data.brand_id) : NaN;
          pe.entry_data = {
            ...data,
            party_name: Number.isFinite(pid) ? partyNames.get(pid) ?? null : null,
            brand_name: Number.isFinite(bid) ? brandNames.get(bid) ?? null : null,
          };
        } else if (pe.entry_type === 'purchase') {
          const sid = data.supplier_id != null ? Number(data.supplier_id) : NaN;
          const bid = data.brand_id != null ? Number(data.brand_id) : NaN;
          pe.entry_data = {
            ...data,
            brand_name: Number.isFinite(bid) ? brandNames.get(bid) ?? null : null,
            supplier_name: Number.isFinite(sid) ? partyNames.get(sid) ?? data.supplier_name ?? null : data.supplier_name ?? null,
          };
        } else if (pe.entry_type === 'payment') {
          const pid = data.party_id != null ? Number(data.party_id) : NaN;
          pe.entry_data = {
            ...data,
            party_name: Number.isFinite(pid) ? partyNames.get(pid) ?? null : null,
          };
        }
      } catch (_) { /* leave as-is if merge fails */ }
    }

    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

// GET /api/pending-entries/count — fast badge count; ?source= filters by book
router.get('/count', async (req, res) => {
  try {
    const source = (req.query.source as string) || 'cementbook';
    let r: any;
    if (req.user!.role === 'admin') {
      r = await getOne(`SELECT COUNT(*) as count FROM pending_entries WHERE status='pending' AND source=$1`, [source]);
    } else {
      r = await getOne(`SELECT COUNT(*) as count FROM pending_entries WHERE status='pending' AND created_by=$1 AND source=$2`, [req.user!.id, source]);
    }
    res.json({ count: Number(r.count) });
  } catch (e: any) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

// POST /api/pending-entries/:id/approve (admin or tb_approve for transportbook entries)
router.post('/:id/approve', async (req, res) => {
  const isAdmin = req.user!.role === 'admin';
  const tbApprover = !isAdmin && await hasTbApprove(req.user!.id);
  if (!isAdmin && !tbApprover) return res.status(403).json({ error: 'Insufficient permissions' });
  try {
    const pending = await getOne(
      `SELECT * FROM pending_entries WHERE id=$1 AND status='pending'`,
      [req.params.id]
    );
    if (!pending) return res.status(404).json({ error: 'Pending entry not found or already processed' });
    if (tbApprover && pending.source !== 'transportbook') {
      return res.status(403).json({ error: 'You can only approve TransportBook entries' });
    }

    const data = pending.entry_data;
    let result: any;

    if (pending.entry_type === 'sale') {
      const stock = await getStock(data.brand_id, data.godown_id || undefined);
      if (data.bags > stock) {
        return res.status(400).json({ error: `Insufficient stock: only ${stock} bags available. Cannot approve.` });
      }
      result = await getOne(
        `INSERT INTO sales (date, party_id, brand_id, cement_type, bags, sale_rate, cost_rate, destination, invoice_number, billed_party, billed_quantity, billed_rate, billed_amount, truck_number, godown_id, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [
          data.date, data.party_id, data.brand_id, data.cement_type, data.bags, data.sale_rate,
          data.cost_rate || 0, data.destination, data.invoice_number, data.billed_party,
          data.billed_quantity || null, data.billed_rate || null, data.billed_amount || null,
          data.truck_number, data.godown_id || null, data.remarks,
        ]
      );
    } else if (pending.entry_type === 'purchase') {
      const party = data.supplier_id ? await getOne('SELECT name FROM parties WHERE id=$1', [data.supplier_id]) : null;
      const supplier_name = party?.name ?? data.supplier_name ?? '';
      result = await getOne(
        `INSERT INTO purchases (date, supplier_name, supplier_id, brand_id, cement_type, bags, purchase_rate, freight_rate, godown_id, truck_number, source_location, invoice_number, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          data.date, supplier_name, data.supplier_id || null, data.brand_id, data.cement_type,
          data.bags, data.purchase_rate, data.freight_rate || 0, data.godown_id || null,
          data.truck_number, data.source_location, data.invoice_number || null, data.remarks,
        ]
      );
    } else if (pending.entry_type === 'payment') {
      const dir = data.direction === 'pay' ? 'pay' : 'receive';
      const mode = data.mode || 'cash';
      const handler = mode === 'cash' ? (data.cash_handler || null) : null;
      const bank    = mode === 'bank' ? (data.bank_name    || null) : null;
      result = await getOne(
        `INSERT INTO payments (date, party_id, amount, mode, bank_name, cash_handler, remarks, direction)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [data.date, data.party_id, data.amount, mode, bank, handler, data.remarks, dir]
      );
      const party = await getOne(`SELECT name FROM parties WHERE id=$1`, [data.party_id]);
      await syncImprestForCashTxn({
        sourceTable: 'payments',
        sourceId: result.id,
        mode,
        cashHandler: handler,
        amount: Number(data.amount),
        date: data.date,
        direction: dir === 'pay' ? 'debit' : 'credit',
        particulars: `${dir === 'pay' ? 'Payment to' : 'Receipt from'} ${party?.name ?? 'Party #' + data.party_id}`,
        narration: data.remarks || null,
      });
    } else if (pending.entry_type === 'expense') {
      const mode = data.mode || 'cash';
      const handler = mode === 'cash' ? (data.cash_handler || null) : null;
      const bank    = mode === 'bank' ? (data.bank_name    || null) : null;
      result = await getOne(
        `INSERT INTO expenses (date, amount, category, description, bank_name, cash_handler, mode)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [data.date, data.amount, data.category, data.description, bank, handler, mode]
      );
      await syncImprestForCashTxn({
        sourceTable: 'expenses',
        sourceId: result.id,
        mode,
        cashHandler: handler,
        amount: Number(data.amount),
        date: data.date,
        particulars: `Expense — ${data.category || 'General'}`,
        narration: data.description || null,
      });
    } else if (pending.entry_type === 'truck_trip') {
      const d = data;
      // Replay the full computeTripFields → INSERT flow that the live POST does.
      const { computeTripFields } = await import('./truckTrips');
      const gstRow = d.transporter_id
        ? await getOne('SELECT has_gst FROM transporters WHERE id=$1', [d.transporter_id])
        : null;
      const c = computeTripFields({ ...d, has_gst: !!gstRow?.has_gst });
      // Trip Log freight-side replay only — costs/wallet stay zero, expense_completed=false
      // so the trip surfaces in the Trip Expenses tab for follow-up.
      result = await getOne(
        `INSERT INTO truck_trips (
          date, truck_id, driver_id, material_name, quantity,
          load_from, billed_party, billed_destination,
          transporter_id, diesel_from_id, transporter_commission,
          freight_rate, advance_deduction,
          gst_amount, total_freight, net_freight, net_profit, remarks,
          expense_completed
        ) VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,
          $9,$10,$11,
          $12,$13,
          $14,$15,$16,$17,$18,
          $19
        ) RETURNING *`,
        [
          d.date, d.truck_id, d.driver_id || null, d.material_name || null, c.quantity,
          d.load_from || null, d.billed_party || null, d.billed_destination || null,
          d.transporter_id || null, d.diesel_from_id || null, c.transporter_commission,
          c.freight_rate, c.advance_deduction,
          c.gst_amount, c.total_freight, c.net_freight, c.net_profit, d.remarks || null,
          false,
        ]
      );
    } else if (pending.entry_type === 'truck_expense') {
      const d = data;
      const mode = d.mode || 'cash';
      const handler = mode === 'cash' ? (d.cash_handler || null) : null;
      const bank    = mode === 'bank' ? (d.bank_name    || null) : null;
      result = await getOne(
        `INSERT INTO truck_expenses (date, truck_id, category, description, amount, mode, bank_name, cash_handler)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [d.date, d.truck_id || null, d.category || null, d.description || null, d.amount, mode, bank, handler]
      );
      const truck = d.truck_id ? await getOne(`SELECT truck_number FROM trucks WHERE id=$1`, [d.truck_id]) : null;
      await syncImprestForCashTxn({
        sourceTable: 'truck_expenses',
        sourceId: result.id,
        mode, cashHandler: handler,
        amount: Number(d.amount), date: d.date,
        particulars: `Truck expense — ${d.category || 'General'}${truck?.truck_number ? ' (' + truck.truck_number + ')' : ''}`,
        narration: d.description || null,
      });
    } else if (pending.entry_type === 'driver_payment') {
      const d = data;
      const mode = d.mode || 'cash';
      const handler = mode === 'cash' ? (d.cash_handler || null) : null;
      const bank    = mode === 'bank' ? (d.bank_name    || null) : null;
      result = await getOne(
        `INSERT INTO driver_payments (date, driver_id, amount, mode, bank_name, cash_handler, trip_id, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [d.date, d.driver_id, d.amount, mode, bank, handler, d.trip_id || null, d.remarks || null]
      );
      const driver = await getOne(`SELECT name FROM drivers WHERE id=$1`, [d.driver_id]);
      await syncImprestForCashTxn({
        sourceTable: 'driver_payments',
        sourceId: result.id,
        mode, cashHandler: handler,
        amount: Number(d.amount), date: d.date,
        particulars: `Driver payment — ${driver?.name ?? 'Driver #' + d.driver_id}`,
        narration: d.remarks || null,
      });
    } else if (pending.entry_type === 'transporter_payment') {
      const d = data;
      const mode = d.mode || 'cash';
      const handler = mode === 'cash' ? (d.cash_handler || null) : null;
      const bank    = mode === 'bank' ? (d.bank_name    || null) : null;
      const pType   = d.payment_type || 'paid';
      result = await getOne(
        `INSERT INTO transporter_payments (date, transporter_id, amount, mode, bank_name, cash_handler, remarks, payment_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [d.date, Number(d.transporter_id), Number(d.amount), mode, bank, handler, d.remarks || null, pType]
      );
      const transporter = await getOne(`SELECT name FROM transporters WHERE id=$1`, [d.transporter_id]);
      await syncImprestForCashTxn({
        sourceTable: 'transporter_payments',
        sourceId: result.id,
        mode, cashHandler: handler,
        amount: Number(d.amount), date: d.date,
        direction: pType === 'received' ? 'credit' : 'debit',
        particulars: `Transporter ${pType === 'received' ? 'receipt' : 'payment'} — ${transporter?.name ?? 'Transporter #' + d.transporter_id}`,
        narration: d.remarks || null,
      });
    } else if (pending.entry_type === 'rl_trip') {
      const d = data;
      // Resolve commission % the same way the live POST does, for consistency
      let resolvedCommissionPct = Number(d.commission_pct);
      if (!Number.isFinite(resolvedCommissionPct)) {
        const owner = await getOne('SELECT commission_pct FROM rl_truck_owners WHERE id=$1', [Number(d.truck_owner_id)]);
        resolvedCommissionPct = Number(owner?.commission_pct);
        if (!Number.isFinite(resolvedCommissionPct)) resolvedCommissionPct = 6.29;
      }
      const dieselPartyIdNum = d.diesel_party_id ? Number(d.diesel_party_id) : null;
      const dieselAdvanceNum = Number(d.diesel_advance) || 0;
      const tripCompany = (typeof d.company === 'string' && (d.company === 'acc' || d.company === 'jk')) ? d.company : 'acc';
      result = await getOne(
        `INSERT INTO rl_trips
          (date, builty_number, do_number, truck_owner_id, party_name, location, dch_type, material_type,
           qty, acc_freight_rate, commission_pct, diesel_advance, cash_advance,
           petrol_slip_number, epod_bill_number, difference_rate, remarks,
           eway_bill_number, eway_bill_generated_at, eway_bill_valid_until,
           delivery_status, delivered_at, diesel_party_id, company)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
         RETURNING *`,
        [
          d.date, d.builty_number?.trim() || null, d.do_number?.trim() || null,
          Number(d.truck_owner_id), (d.party_name || '').trim(),
          d.location?.trim() || null, d.dch_type?.trim() || null, d.material_type || null,
          Number(d.qty) || 0, Number(d.acc_freight_rate) || 0, resolvedCommissionPct,
          dieselAdvanceNum, Number(d.cash_advance) || 0,
          d.petrol_slip_number?.trim() || null, d.epod_bill_number?.trim() || null,
          Number(d.difference_rate) || 0, d.remarks?.trim() || null,
          d.eway_bill_number?.trim() || null, d.eway_bill_generated_at || null, d.eway_bill_valid_until || null,
          d.delivery_status || 'pending', d.delivered_at || null, dieselPartyIdNum, tripCompany,
        ]
      );
      await syncDieselDebitForSource(
        'rl_trip', result.id, dieselPartyIdNum, dieselAdvanceNum, d.date,
        d.builty_number?.trim() ? `Trip ${d.builty_number.trim()}` : `Trip #${result.id}`,
      );
    } else if (pending.entry_type === 'rl_owner_advance') {
      const d = data;
      result = await getOne(
        `INSERT INTO rl_owner_advances (owner_name, date, amount, remarks)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [(d.owner_name || '').trim(), d.date, Number(d.amount), d.remarks?.trim() || null]
      );
    } else if (pending.entry_type === 'rl_partner_transaction') {
      const d = data;
      result = await getOne(
        `INSERT INTO rl_partner_transactions (date, partner_id, type, amount, remarks)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [d.date, Number(d.partner_id), d.type, Number(d.amount), d.remarks?.trim() || null]
      );
    } else if (pending.entry_type === 'freight_party_payment') {
      const d = data;
      const m = d.mode === 'cash' ? 'cash' : 'bank';
      const handler = m === 'cash' ? (d.cash_handler || null) : null;
      const bank    = m === 'bank' ? (d.bank_name    || null) : null;
      const pType   = d.payment_type || 'paid';
      result = await getOne(
        `INSERT INTO freight_party_payments (date, freight_party_id, amount, mode, bank_name, cash_handler, remarks, payment_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [d.date, Number(d.freight_party_id), Number(d.amount), m, bank, handler, d.remarks?.trim() || null, pType]
      );
      const fp = await getOne(`SELECT name FROM freight_parties WHERE id=$1`, [Number(d.freight_party_id)]);
      await syncImprestForCashTxn({
        sourceTable: 'freight_party_payments',
        sourceId: result.id,
        mode: m, cashHandler: handler,
        amount: Number(d.amount), date: d.date,
        direction: pType === 'received' ? 'credit' : 'debit',
        particulars: `Freight ${pType === 'received' ? 'receipt' : 'payment'} — ${fp?.name ?? 'Freight party #' + d.freight_party_id}`,
        narration: d.remarks || null,
      });
    } else if (pending.entry_type === 'rl_expense') {
      const d = data;
      const m = d.mode === 'cash' ? 'cash' : 'bank';
      const handler = m === 'cash' ? (d.cash_handler || null) : null;
      const bank    = m === 'bank' ? (d.bank_name    || null) : null;
      result = await getOne(
        `INSERT INTO rl_expenses (date, category, description, amount, mode, bank_name, cash_handler, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [d.date, d.category || null, d.description || null, Number(d.amount), m, bank, handler, d.remarks || null]
      );
      await syncImprestForCashTxn({
        sourceTable: 'rl_expenses',
        sourceId: result.id,
        mode: m, cashHandler: handler,
        amount: Number(d.amount), date: d.date,
        particulars: `Transport expense — ${d.category || 'General'}`,
        narration: d.description || null,
      });
    } else if (pending.entry_type === 'rl_bank_txn') {
      const d = data;
      result = await getOne(
        `INSERT INTO rl_bank_transactions (bank_id, date, type, amount, particulars, remarks, source_table)
         VALUES ($1,$2,$3,$4,$5,$6,'manual') RETURNING *`,
        [Number(d.bank_id), d.date, d.type, Number(d.amount), d.particulars?.trim() || null, d.remarks?.trim() || null]
      );
    } else if (pending.entry_type === 'rl_invoice_payment') {
      const d = data;
      const m = d.mode === 'cash' ? 'cash' : 'bank';
      result = await getOne(
        `INSERT INTO rl_invoice_payments (invoice_id, date, amount, mode, bank_name, reference, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [Number(d.invoice_id), d.date, Number(d.amount), m, m === 'bank' ? (d.bank_name || null) : null, d.reference?.trim() || null, d.remarks?.trim() || null]
      );
      // Recompute the invoice's received_amount + status from the payment ledger.
      const tot = await getOne(
        `SELECT COALESCE(SUM(amount),0)::float AS total, MAX(date) AS last_date
         FROM rl_invoice_payments WHERE invoice_id=$1`,
        [Number(d.invoice_id)]
      );
      const inv = await getOne('SELECT invoice_amount FROM rl_invoices WHERE id=$1', [Number(d.invoice_id)]);
      const invAmt = Number(inv?.invoice_amount) || 0;
      const recAmt = Number(tot?.total) || 0;
      let status: 'pending' | 'partial' | 'done' = 'pending';
      if (invAmt > 0 && recAmt >= invAmt * 0.98) status = 'done';
      else if (recAmt > 0) status = 'partial';
      await query(
        `UPDATE rl_invoices SET received_amount=$1, payment_receive_date=$2, status=$3 WHERE id=$4`,
        [recAmt, tot?.last_date || null, status, Number(d.invoice_id)]
      );
    } else {
      return res.status(400).json({ error: 'Unknown entry type' });
    }

    await query(
      `UPDATE pending_entries SET status='approved', reviewed_by=$1, reviewed_at=NOW(), admin_note=$2 WHERE id=$3`,
      [req.user!.id, req.body.admin_note || null, pending.id]
    );

    res.json({ approved: true, entry: result });
  } catch (e: any) {
    res.status(400).json({ error: friendlyError(e) });
  }
});

// POST /api/pending-entries/:id/reject (admin or tb_approve for transportbook entries)
router.post('/:id/reject', async (req, res) => {
  const isAdmin = req.user!.role === 'admin';
  const tbApprover = !isAdmin && await hasTbApprove(req.user!.id);
  if (!isAdmin && !tbApprover) return res.status(403).json({ error: 'Insufficient permissions' });
  try {
    const pending = await getOne(
      `SELECT id, source FROM pending_entries WHERE id=$1 AND status='pending'`,
      [req.params.id]
    );
    if (!pending) return res.status(404).json({ error: 'Pending entry not found or already processed' });
    if (tbApprover && pending.source !== 'transportbook') {
      return res.status(403).json({ error: 'You can only reject TransportBook entries' });
    }

    await query(
      `UPDATE pending_entries SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), admin_note=$2 WHERE id=$3`,
      [req.user!.id, req.body.admin_note || null, req.params.id]
    );

    res.json({ rejected: true });
  } catch (e: any) {
    res.status(400).json({ error: friendlyError(e) });
  }
});

// DELETE /api/pending-entries/:id
// Users can only delete their own pending entries; admin can delete any
router.delete('/:id', async (req, res) => {
  try {
    let row: any;
    if (req.user!.role === 'admin') {
      row = await getOne('SELECT id FROM pending_entries WHERE id=$1', [req.params.id]);
    } else {
      row = await getOne(
        `SELECT id FROM pending_entries WHERE id=$1 AND created_by=$2 AND status='pending'`,
        [req.params.id, req.user!.id]
      );
    }
    if (!row) return res.status(404).json({ error: 'Not found or not allowed' });

    await query('DELETE FROM pending_entries WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: friendlyError(e) });
  }
});

export default router;
