import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { friendlyError } from '../lib/userError';
import {
  walletBalance, fastagBalance,
  syncWalletDebitForSource, syncFastagDebitForSource,
  deleteWalletForSource, deleteFastagForSource,
} from '../lib/walletSync';

const router = Router();

export function computeTripFields(body: any) {
  const quantity             = Number(body.quantity)              || 0;
  const freight_rate         = Number(body.freight_rate)          || 0;
  const loading_charge       = Number(body.loading_charge)        || 0;
  const unloading_charge     = Number(body.unloading_charge)      || 0;
  const advance_deduction    = Number(body.advance_diesel_amount) || 0;
  const toll_expense         = Number(body.toll_expense)          || 0;
  const diesel_amount        = Number(body.trip_diesel_amount)    || 0;
  const driver_payment       = Number(body.driver_payment)        || 0;
  const transporter_commission = Number(body.transporter_commission) || 0;
  const miscellaneous        = Number(body.miscellaneous)         || 0;
  const odometer_start       = body.odometer_start ? Number(body.odometer_start) : null;
  const odometer_end         = body.odometer_end   ? Number(body.odometer_end)   : null;

  const base_freight         = quantity * freight_rate;
  // GST: when the trip's transporter is GST-registered, +18% is added on top of the base freight.
  const has_gst              = !!body.has_gst;
  const gst_amount           = has_gst ? base_freight * 0.18 : 0;
  const total_freight        = base_freight + gst_amount;
  // Net Freight = freight side only (income net of freight-side liabilities).
  // Toll, transporter commission and advance diesel are obligations created by the trip itself.
  const net_freight          = total_freight - toll_expense - transporter_commission - advance_deduction;
  // Net Profit = net freight − all trip expenses (loading + unloading + diesel + driver + misc).
  // Trip diesel is always subtracted regardless of whether the wallet or a transporter funded it —
  // it's the same real cost to the business; only the offsetting liability differs.
  const net_profit           = net_freight - loading_charge - unloading_charge - diesel_amount - driver_payment - miscellaneous;
  const total_km             = (odometer_end !== null && odometer_start !== null)
    ? odometer_end - odometer_start : 0;

  return {
    quantity, freight_rate, loading_charge, unloading_charge,
    advance_deduction,
    toll_expense, diesel_amount,
    driver_payment, transporter_commission, miscellaneous,
    odometer_start, odometer_end, total_km,
    gst_amount, total_freight, net_freight, net_profit,
  };
}

async function transporterHasGst(transporter_id: any): Promise<boolean> {
  if (!transporter_id) return false;
  const row = await getOne('SELECT has_gst FROM transporters WHERE id=$1', [transporter_id]);
  return !!row?.has_gst;
}

// GET /truck-trips
router.get('/', async (req, res) => {
  try {
    const { truck_id, month } = req.query;
    let sql = `
      SELECT tt.*,
        t.truck_number,
        d.name  as driver_name,
        tp.name as transporter_name,
        df.name as diesel_from_name
      FROM truck_trips tt
      JOIN trucks t ON tt.truck_id = t.id
      LEFT JOIN drivers d       ON tt.driver_id        = d.id
      LEFT JOIN transporters tp ON tt.transporter_id   = tp.id
      LEFT JOIN transporters df ON tt.diesel_from_id   = df.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (truck_id) { sql += ` AND tt.truck_id = $${idx++}`; params.push(truck_id); }
    if (month)    { sql += ` AND to_char(tt.date::date, 'YYYY-MM') = $${idx++}`; params.push(month); }

    sql += ' ORDER BY tt.date DESC, tt.id DESC';
    res.json(await getAll(sql, params));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /truck-trips
router.post('/', async (req, res) => {
  try {
    const {
      date, truck_id, driver_id, material_name, load_from, billed_party,
      billed_destination, transporter_id, diesel_from_id, remarks,
    } = req.body;
    if (!date || !truck_id) return res.status(400).json({ error: 'date and truck_id are required' });

    // All non-admin entries — present or past — go through the TruckBook approval queue.
    if (req.user?.role !== 'admin') {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name, source)
         VALUES ('truck_trip', $1::jsonb, $2, $3, 'truckbook') RETURNING id`,
        [JSON.stringify(req.body), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    // Trip Log captures the freight side only — toll, odometer and trip costs are filed
    // via the Trip Expenses tab. Wallet and FastTag are untouched here.
    const has_gst = await transporterHasGst(transporter_id);
    const c = computeTripFields({ ...req.body, has_gst });

    const row = await getOne(
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
        date, truck_id, driver_id || null, material_name || null, c.quantity,
        load_from || null, billed_party || null, billed_destination || null,
        transporter_id || null, diesel_from_id || null, c.transporter_commission,
        c.freight_rate, c.advance_deduction,
        c.gst_amount, c.total_freight, c.net_freight, c.net_profit, remarks || null,
        false,
      ]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /truck-trips/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      date, truck_id, driver_id, material_name, load_from, billed_party,
      billed_destination, transporter_id, diesel_from_id, remarks,
    } = req.body;
    // Editing the freight side preserves the cost-side fields (toll, diesel, expenses)
    // that were filed via the Trip Expenses tab.
    const existing = await getOne(
      `SELECT loading_charge, unloading_charge, diesel_amount,
              driver_payment, miscellaneous, toll_expense
       FROM truck_trips WHERE id=$1`,
      [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Trip not found' });

    const has_gst = await transporterHasGst(transporter_id);
    const c = computeTripFields({
      ...req.body,
      has_gst,
      loading_charge: existing.loading_charge,
      unloading_charge: existing.unloading_charge,
      trip_diesel_amount: existing.diesel_amount,
      driver_payment: existing.driver_payment,
      miscellaneous: existing.miscellaneous,
      toll_expense: existing.toll_expense,
    });

    const row = await getOne(
      `UPDATE truck_trips SET
        date=$1, truck_id=$2, driver_id=$3, material_name=$4, quantity=$5,
        load_from=$6, billed_party=$7, billed_destination=$8,
        transporter_id=$9, diesel_from_id=$10, transporter_commission=$11,
        freight_rate=$12, advance_deduction=$13,
        gst_amount=$14, total_freight=$15, net_freight=$16, net_profit=$17, remarks=$18
      WHERE id=$19 RETURNING *`,
      [
        date, truck_id, driver_id || null, material_name || null, c.quantity,
        load_from || null, billed_party || null, billed_destination || null,
        transporter_id || null, diesel_from_id || null, c.transporter_commission,
        c.freight_rate, c.advance_deduction,
        c.gst_amount, c.total_freight, c.net_freight, c.net_profit, remarks || null,
        req.params.id,
      ]
    );
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PATCH /truck-trips/:id/freight — update only the freight rate (and optionally the
// quantity) on an existing trip and re-sync the wallet debit. Open to any authed user
// since logging the freight rate later is part of every TruckBook user's regular flow.
router.patch('/:id/freight', async (req, res) => {
  try {
    const existing = await getOne(`SELECT * FROM truck_trips WHERE id=$1`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Trip not found' });

    const freightRate = Number(req.body.freight_rate);
    if (!Number.isFinite(freightRate) || freightRate < 0) {
      return res.status(400).json({ error: 'freight_rate must be a non-negative number' });
    }
    // Quantity is optional — fall back to whatever the trip already had.
    const quantity = req.body.quantity !== undefined && req.body.quantity !== null && req.body.quantity !== ''
      ? Number(req.body.quantity)
      : Number(existing.quantity) || 0;
    if (!Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'quantity must be a non-negative number' });
    }

    // Freight is income, not a wallet outflow — recompute net_freight (freight side) and
    // net_profit (after the trip's recorded expenses) without touching the wallet.
    // GST: respect the trip's transporter has_gst flag.
    const has_gst = await transporterHasGst(existing.transporter_id);
    const base_freight = quantity * freightRate;
    const gst_amount = has_gst ? base_freight * 0.18 : 0;
    const total_freight = base_freight + gst_amount;
    const toll_expense = Number(existing.toll_expense) || 0;
    const transporter_commission = Number(existing.transporter_commission) || 0;
    const advance_deduction = Number(existing.advance_deduction) || 0;
    const loading_charge = Number(existing.loading_charge) || 0;
    const unloading_charge = Number(existing.unloading_charge) || 0;
    const diesel_amount = Number(existing.diesel_amount) || 0;
    const driver_payment = Number(existing.driver_payment) || 0;
    const miscellaneous = Number(existing.miscellaneous) || 0;
    const net_freight = total_freight - toll_expense - transporter_commission - advance_deduction;
    const net_profit = net_freight - loading_charge - unloading_charge - diesel_amount - driver_payment - miscellaneous;

    const row = await getOne(
      `UPDATE truck_trips
         SET freight_rate=$1, quantity=$2, gst_amount=$3, total_freight=$4, net_freight=$5, net_profit=$6
       WHERE id=$7 RETURNING *`,
      [freightRate, quantity, gst_amount, total_freight, net_freight, net_profit, req.params.id]
    );

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PATCH /truck-trips/:id/expense — fill or update the cost-side fields and debit the
// wallet by the total trip expense. Open to any authed user.
router.patch('/:id/expense', async (req, res) => {
  try {
    const existing = await getOne(`SELECT * FROM truck_trips WHERE id=$1`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Trip not found' });

    const loading_charge   = Number(req.body.loading_charge)   || 0;
    const unloading_charge = Number(req.body.unloading_charge) || 0;
    const diesel_amount    = Number(req.body.trip_diesel_amount) || 0;
    const tripDieselFromId = req.body.trip_diesel_from_id ? Number(req.body.trip_diesel_from_id) : null;
    const driver_payment   = Number(req.body.driver_payment)   || 0;
    const miscellaneous    = Number(req.body.miscellaneous)    || 0;
    const toll_expense     = Number(req.body.toll_expense)     || 0;
    const fastagId         = req.body.fastag_id ? Number(req.body.fastag_id) : null;
    // Advance diesel can also be edited from this form (optional). Falls back to whatever
    // the trip already had if the field isn't sent.
    const advance_deduction = req.body.advance_diesel_amount !== undefined && req.body.advance_diesel_amount !== null && req.body.advance_diesel_amount !== ''
      ? Number(req.body.advance_diesel_amount) : (Number(existing.advance_deduction) || 0);
    const advanceFromId = req.body.diesel_from_id !== undefined
      ? (req.body.diesel_from_id ? Number(req.body.diesel_from_id) : null)
      : (existing.diesel_from_id ? Number(existing.diesel_from_id) : null);
    const odometer_start   = req.body.odometer_start !== undefined && req.body.odometer_start !== null && req.body.odometer_start !== ''
      ? Number(req.body.odometer_start) : null;
    const odometer_end     = req.body.odometer_end !== undefined && req.body.odometer_end !== null && req.body.odometer_end !== ''
      ? Number(req.body.odometer_end) : null;
    const total_km         = (odometer_start !== null && odometer_end !== null) ? odometer_end - odometer_start : 0;

    if (diesel_amount > 0 && tripDieselFromId === null && false) { /* wallet path is fine */ }
    if (advance_deduction > 0 && !advanceFromId) {
      return res.status(400).json({ error: 'Pick the transporter who provided the advance diesel.' });
    }

    // Wallet covers loading + unloading + driver + misc + (trip diesel only if no transporter funded it).
    // Toll → FastTag. Trip diesel from transporter → that transporter's ledger.
    const wallet_expense = loading_charge + unloading_charge + driver_payment + miscellaneous
      + (tripDieselFromId === null ? diesel_amount : 0);

    const total_freight = Number(existing.total_freight) || 0;
    const transporter_commission = Number(existing.transporter_commission) || 0;
    const net_freight = total_freight - toll_expense - transporter_commission - advance_deduction;
    const net_profit = net_freight - loading_charge - unloading_charge - diesel_amount - driver_payment - miscellaneous;

    // FastTag pre-flight (toll comes off the FastTag, not the wallet). Editing this trip's
    // own existing toll on the same tag is reusable, so add it back when computing effective.
    if (fastagId && toll_expense > 0) {
      const fb = await fastagBalance(fastagId);
      const oldFastag = existing.fastag_id ? Number(existing.fastag_id) : null;
      const oldToll = Number(existing.toll_expense) || 0;
      const effective = fb + (oldFastag === fastagId ? oldToll : 0);
      if (effective < toll_expense) {
        return res.status(400).json({ error: `Selected FastTag balance (₹${effective.toFixed(2)}) is less than the trip's toll (₹${toll_expense.toFixed(2)}). Top up the FastTag before saving.` });
      }
    }
    if (toll_expense > 0 && !fastagId) {
      return res.status(400).json({ error: 'Pick a FastTag to deduct the toll from.' });
    }

    // Wallet pre-flight: only the wallet-funded slice counts. We mirror what the previous
    // expense filing actually charged the wallet (diesel only counts if it wasn't transporter-funded).
    const oldTripDieselFromId = existing.trip_diesel_from_id ? Number(existing.trip_diesel_from_id) : null;
    const oldWalletExpense = (Number(existing.loading_charge) || 0)
      + (Number(existing.unloading_charge) || 0)
      + (Number(existing.driver_payment) || 0)
      + (Number(existing.miscellaneous) || 0)
      + (oldTripDieselFromId === null ? (Number(existing.diesel_amount) || 0) : 0);
    if (wallet_expense > 0) {
      const wb = await walletBalance();
      const effective = wb + (existing.expense_completed ? oldWalletExpense : 0);
      if (effective < wallet_expense) {
        return res.status(400).json({ error: `Wallet balance (₹${effective.toFixed(2)}) is less than the wallet-funded expenses (₹${wallet_expense.toFixed(2)}). Top up the wallet first.` });
      }
    }

    const row = await getOne(
      `UPDATE truck_trips SET
         loading_charge=$1, unloading_charge=$2,
         diesel_amount=$3, trip_diesel_from_id=$4,
         driver_payment=$5, miscellaneous=$6,
         toll_expense=$7, fastag_id=$8,
         odometer_start=$9, odometer_end=$10, total_km=$11,
         advance_deduction=$12, diesel_from_id=$13,
         net_freight=$14, net_profit=$15,
         expense_completed=TRUE
       WHERE id=$16 RETURNING *`,
      [loading_charge, unloading_charge,
       diesel_amount, tripDieselFromId,
       driver_payment, miscellaneous,
       toll_expense, fastagId,
       odometer_start, odometer_end, total_km,
       advance_deduction, advanceFromId,
       net_freight, net_profit, req.params.id]
    );

    await syncWalletDebitForSource(
      'truck_trip_expense', row.id, wallet_expense, row.date, `Expenses for trip #${row.id}`,
    );
    await syncFastagDebitForSource(
      'truck_trip', row.id, fastagId, toll_expense, row.date, `Toll for trip #${row.id}`,
    );

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /truck-trips/:id (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await deleteWalletForSource('truck_trip_expense', Number(req.params.id));
    await deleteFastagForSource('truck_trip', Number(req.params.id));
    await query('DELETE FROM truck_trips WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
