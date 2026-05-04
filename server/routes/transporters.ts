import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';

const router = Router();

// GET /transporters — list with summary
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT t.*,
        COALESCE((SELECT SUM(transporter_commission) FROM truck_trips WHERE transporter_id=t.id),0) as total_commission,
        COALESCE((SELECT SUM(advance_deduction) FROM truck_trips WHERE diesel_from_id=t.id),0) as total_advance_diesel,
        COALESCE((SELECT SUM(diesel_amount) FROM truck_trips WHERE trip_diesel_from_id=t.id),0) as total_trip_diesel,
        COALESCE((SELECT SUM(amount) FROM transporter_payments WHERE transporter_id=t.id AND COALESCE(payment_type,'paid')='paid'),0) as total_paid,
        COALESCE((SELECT SUM(amount) FROM transporter_payments WHERE transporter_id=t.id AND payment_type='received'),0) as total_received,
        COALESCE((SELECT COUNT(*) FROM truck_trips WHERE transporter_id=t.id),0) as trip_count
      FROM transporters t ORDER BY t.name
    `);
    res.json(rows.map((r: any) => ({
      ...r,
      total_commission: Number(r.total_commission),
      total_advance_diesel: Number(r.total_advance_diesel),
      total_trip_diesel: Number(r.total_trip_diesel),
      total_paid: Number(r.total_paid),
      total_received: Number(r.total_received),
      trip_count: Number(r.trip_count),
      outstanding: Number(r.total_commission) + Number(r.total_advance_diesel) + Number(r.total_trip_diesel) - Number(r.total_paid) - Number(r.total_received),
    })));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /transporters/:id/ledger
router.get('/:id/ledger', async (req, res) => {
  try {
    const transporter = await getOne('SELECT * FROM transporters WHERE id=$1', [req.params.id]);
    if (!transporter) return res.status(404).json({ error: 'Transporter not found' });

    // Commission entries — trips where this transporter transported goods
    const commEntries = await getAll(`
      SELECT tt.date, 'commission' as entry_type, tt.transporter_commission as amount,
        t.truck_number, tt.load_from, tt.billed_destination, tt.material_name, tt.id as trip_id,
        NULL as mode, NULL as bank_name, NULL as remarks
      FROM truck_trips tt JOIN trucks t ON tt.truck_id=t.id
      WHERE tt.transporter_id=$1 AND tt.transporter_commission > 0
    `, [req.params.id]);

    // Advance diesel entries — trips where this transporter provided diesel up front
    const dieselEntries = await getAll(`
      SELECT tt.date, 'advance_diesel' as entry_type, tt.advance_deduction as amount,
        t.truck_number, tt.load_from, tt.billed_destination, tt.material_name, tt.id as trip_id,
        NULL as mode, NULL as bank_name, NULL as remarks
      FROM truck_trips tt JOIN trucks t ON tt.truck_id=t.id
      WHERE tt.diesel_from_id=$1 AND tt.advance_deduction > 0
    `, [req.params.id]);

    // Trip diesel entries — trips where this transporter funded the trip's diesel
    const tripDieselEntries = await getAll(`
      SELECT tt.date, 'trip_diesel' as entry_type, tt.diesel_amount as amount,
        t.truck_number, tt.load_from, tt.billed_destination, tt.material_name, tt.id as trip_id,
        NULL as mode, NULL as bank_name, NULL as remarks
      FROM truck_trips tt JOIN trucks t ON tt.truck_id=t.id
      WHERE tt.trip_diesel_from_id=$1 AND tt.diesel_amount > 0
    `, [req.params.id]);

    // Payment entries
    const paymentEntries = await getAll(`
      SELECT id, date, 'payment' as entry_type, amount,
        NULL as truck_number, NULL as load_from, NULL as billed_destination,
        NULL as material_name, NULL as trip_id, mode, bank_name, cash_handler, remarks,
        COALESCE(payment_type, 'paid') as payment_type
      FROM transporter_payments WHERE transporter_id=$1
    `, [req.params.id]);

    // Merge all and sort by date asc, then compute running balance
    const all = [...commEntries, ...dieselEntries, ...tripDieselEntries, ...paymentEntries]
      .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.trip_id - b.trip_id);

    let balance = 0;
    const ledger = all.map((e: any) => {
      const amt = Number(e.amount);
      if (e.entry_type === 'payment') {
        // both 'paid' (we paid them) and 'received' (they paid us) reduce what we owe
        balance -= amt;
      } else {
        balance += amt;
      }
      return { ...e, amount: amt, balance };
    });

    const totalEarned =
      commEntries.reduce((s: number, r: any) => s + Number(r.amount), 0) +
      dieselEntries.reduce((s: number, r: any) => s + Number(r.amount), 0) +
      tripDieselEntries.reduce((s: number, r: any) => s + Number(r.amount), 0);
    const totalPaid = paymentEntries
      .filter((r: any) => (r.payment_type || 'paid') === 'paid')
      .reduce((s: number, r: any) => s + Number(r.amount), 0);
    const totalReceived = paymentEntries
      .filter((r: any) => r.payment_type === 'received')
      .reduce((s: number, r: any) => s + Number(r.amount), 0);

    res.json({ transporter, ledger, totalEarned, totalPaid, totalReceived, outstanding: totalEarned - totalPaid - totalReceived });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /transporters
router.post('/', async (req, res) => {
  try {
    const { name, phone, has_gst } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const row = await getOne(
      'INSERT INTO transporters (name, phone, has_gst) VALUES ($1,$2,$3) RETURNING *',
      [name.trim(), phone?.trim() || null, !!has_gst]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /transporters/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, has_gst } = req.body;
    const row = await getOne(
      'UPDATE transporters SET name=$1, phone=$2, has_gst=$3 WHERE id=$4 RETURNING *',
      [name.trim(), phone?.trim() || null, !!has_gst, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Transporter not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /transporters/:id
router.delete('/:id', async (req, res) => {
  try {
    const used = await getOne(
      'SELECT 1 FROM truck_trips WHERE transporter_id=$1 OR diesel_from_id=$1 OR trip_diesel_from_id=$1 LIMIT 1',
      [req.params.id]
    );
    if (used) return res.status(400).json({ error: 'Transporter has trips and cannot be deleted' });
    await query('DELETE FROM transporters WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// POST /transporters/:id/payments
router.post('/:id/payments', async (req: any, res) => {
  try {
    const { date, amount, mode, bank_name, cash_handler, remarks, payment_type } = req.body;
    if (!date || !amount) return res.status(400).json({ error: 'date and amount required' });

    // All non-admin entries — present or past — go through the TruckBook approval queue.
    if (req.user?.role !== 'admin') {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const payload = { ...req.body, transporter_id: Number(req.params.id) };
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name, source)
         VALUES ('transporter_payment', $1::jsonb, $2, $3, 'truckbook') RETURNING id`,
        [JSON.stringify(payload), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    const normalizedMode = mode || 'cash';
    const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
    const bank    = normalizedMode === 'bank' ? (bank_name    || null) : null;
    const pType   = payment_type || 'paid';

    const row = await getOne(
      `INSERT INTO transporter_payments (date, transporter_id, amount, mode, bank_name, cash_handler, remarks, payment_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [date, req.params.id, Number(amount), normalizedMode, bank, handler, remarks || null, pType]
    );

    const transporter = await getOne(`SELECT name FROM transporters WHERE id=$1`, [req.params.id]);
    await syncImprestForCashTxn({
      sourceTable: 'transporter_payments',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      // 'paid' = cash goes OUT of handler; 'received' = cash comes IN.
      direction: pType === 'received' ? 'credit' : 'debit',
      particulars: `Transporter ${pType === 'received' ? 'receipt' : 'payment'} — ${transporter?.name ?? 'Transporter #' + req.params.id}`,
      narration: remarks || null,
    });

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /transporters/:id/payments/:pid (admin only)
router.delete('/:id/payments/:pid', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await deleteImprestForSource('transporter_payments', Number(req.params.pid));
    await query('DELETE FROM transporter_payments WHERE id=$1 AND transporter_id=$2', [req.params.pid, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
