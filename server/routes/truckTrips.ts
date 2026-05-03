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
  const diesel_litres        = Number(body.diesel_litres)         || 0;
  const diesel_rate          = Number(body.diesel_rate)           || 0;
  const driver_payment       = Number(body.driver_payment)        || 0;
  const transporter_commission = Number(body.transporter_commission) || 0;
  const miscellaneous        = Number(body.miscellaneous)         || 0;
  const odometer_start       = body.odometer_start ? Number(body.odometer_start) : null;
  const odometer_end         = body.odometer_end   ? Number(body.odometer_end)   : null;

  const diesel_amount        = diesel_litres * diesel_rate;
  const total_freight        = quantity * freight_rate;
  // Net Freight = freight side only (income net of freight-side liabilities).
  // Toll, transporter commission and advance diesel are obligations created by the trip itself.
  const net_freight          = total_freight - toll_expense - transporter_commission - advance_deduction;
  // Net Profit = net freight − trip expenses (loading/unloading/diesel/driver/misc).
  // Trip expenses are filled in via the Trip Expenses tab and debit the wallet there.
  const net_profit           = net_freight - loading_charge - unloading_charge - diesel_amount - driver_payment - miscellaneous;
  const total_km             = (odometer_end !== null && odometer_start !== null)
    ? odometer_end - odometer_start : 0;

  return {
    quantity, freight_rate, loading_charge, unloading_charge,
    advance_deduction,
    toll_expense, diesel_litres, diesel_rate, diesel_amount,
    driver_payment, transporter_commission, miscellaneous,
    odometer_start, odometer_end, total_km,
    total_freight, net_freight, net_profit,
  };
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

    // Non-admin past/future-date entries route through the TruckBook approval queue
    const today = new Date().toISOString().split('T')[0];
    if (req.user?.role !== 'admin' && date !== today) {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name, source)
         VALUES ('truck_trip', $1::jsonb, $2, $3, 'truckbook') RETURNING id`,
        [JSON.stringify(req.body), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    const c = computeTripFields(req.body);
    const fastagId = req.body.fastag_id ? Number(req.body.fastag_id) : null;

    // Trip Log captures the freight side only — wallet is untouched here.
    // FastTag toll is debited because the toll is paid by the FastTag during the trip itself.
    if (fastagId && c.toll_expense > 0) {
      const fb = await fastagBalance(fastagId);
      if (fb < c.toll_expense) {
        return res.status(400).json({ error: `Selected FastTag balance (₹${fb.toFixed(2)}) is less than the trip's toll (₹${c.toll_expense.toFixed(2)}). Top up the FastTag before saving.` });
      }
    }

    const row = await getOne(
      `INSERT INTO truck_trips (
        date, truck_id, driver_id, material_name, quantity,
        load_from, billed_party, billed_destination,
        transporter_id, diesel_from_id, transporter_commission,
        freight_rate, loading_charge, unloading_charge,
        advance_deduction,
        toll_expense, diesel_litres, diesel_rate, diesel_amount,
        driver_payment, miscellaneous,
        odometer_start, odometer_end, total_km,
        total_freight, net_freight, net_profit, remarks, fastag_id,
        expense_completed
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,
        $12,$13,$14,
        $15,
        $16,$17,$18,$19,
        $20,$21,
        $22,$23,$24,
        $25,$26,$27,$28,$29,
        $30
      ) RETURNING *`,
      [
        date, truck_id, driver_id || null, material_name || null, c.quantity,
        load_from || null, billed_party || null, billed_destination || null,
        transporter_id || null, diesel_from_id || null, c.transporter_commission,
        c.freight_rate, c.loading_charge, c.unloading_charge,
        c.advance_deduction,
        c.toll_expense, c.diesel_litres, c.diesel_rate, c.diesel_amount,
        c.driver_payment, c.miscellaneous,
        c.odometer_start, c.odometer_end, c.total_km,
        c.total_freight, c.net_freight, c.net_profit, remarks || null, fastagId,
        false,
      ]
    );
    await syncFastagDebitForSource('truck_trip', row.id, fastagId, c.toll_expense, date, `Toll for trip #${row.id}`);
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
    const fastagId = req.body.fastag_id ? Number(req.body.fastag_id) : null;

    // Editing the freight side preserves whatever cost-side fields the trip already has,
    // so the recompute reuses existing loading/unloading/diesel/driver/misc.
    const existing = await getOne(
      `SELECT loading_charge, unloading_charge, diesel_litres, diesel_rate,
              driver_payment, miscellaneous, toll_expense, fastag_id, expense_completed
       FROM truck_trips WHERE id=$1`,
      [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Trip not found' });

    const c = computeTripFields({
      ...req.body,
      loading_charge: existing.loading_charge,
      unloading_charge: existing.unloading_charge,
      diesel_litres: existing.diesel_litres,
      diesel_rate: existing.diesel_rate,
      driver_payment: existing.driver_payment,
      miscellaneous: existing.miscellaneous,
    });

    const oldToll = Number(existing.toll_expense) || 0;
    const oldFastag = existing.fastag_id ? Number(existing.fastag_id) : null;
    if (fastagId && c.toll_expense > 0) {
      const fb = await fastagBalance(fastagId);
      const effective = fb + (oldFastag === fastagId ? oldToll : 0);
      if (effective < c.toll_expense) {
        return res.status(400).json({ error: `Selected FastTag balance (₹${effective.toFixed(2)}) is less than the trip's toll (₹${c.toll_expense.toFixed(2)}).` });
      }
    }

    const row = await getOne(
      `UPDATE truck_trips SET
        date=$1, truck_id=$2, driver_id=$3, material_name=$4, quantity=$5,
        load_from=$6, billed_party=$7, billed_destination=$8,
        transporter_id=$9, diesel_from_id=$10, transporter_commission=$11,
        freight_rate=$12, advance_deduction=$13,
        toll_expense=$14,
        odometer_start=$15, odometer_end=$16, total_km=$17,
        total_freight=$18, net_freight=$19, net_profit=$20, remarks=$21, fastag_id=$23
      WHERE id=$22 RETURNING *`,
      [
        date, truck_id, driver_id || null, material_name || null, c.quantity,
        load_from || null, billed_party || null, billed_destination || null,
        transporter_id || null, diesel_from_id || null, c.transporter_commission,
        c.freight_rate, c.advance_deduction,
        c.toll_expense,
        c.odometer_start, c.odometer_end, c.total_km,
        c.total_freight, c.net_freight, c.net_profit, remarks || null,
        req.params.id, fastagId,
      ]
    );
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    await syncFastagDebitForSource('truck_trip', row.id, fastagId, c.toll_expense, date, `Toll for trip #${row.id}`);
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
    const total_freight = quantity * freightRate;
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
         SET freight_rate=$1, quantity=$2, total_freight=$3, net_freight=$4, net_profit=$5
       WHERE id=$6 RETURNING *`,
      [freightRate, quantity, total_freight, net_freight, net_profit, req.params.id]
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
    const diesel_litres    = Number(req.body.diesel_litres)    || 0;
    const diesel_rate      = Number(req.body.diesel_rate)      || 0;
    const driver_payment   = Number(req.body.driver_payment)   || 0;
    const miscellaneous    = Number(req.body.miscellaneous)    || 0;
    const diesel_amount    = diesel_litres * diesel_rate;
    const trip_expense     = loading_charge + unloading_charge + diesel_amount + driver_payment + miscellaneous;

    const total_freight = Number(existing.total_freight) || 0;
    const toll_expense = Number(existing.toll_expense) || 0;
    const transporter_commission = Number(existing.transporter_commission) || 0;
    const advance_deduction = Number(existing.advance_deduction) || 0;
    const net_freight = total_freight - toll_expense - transporter_commission - advance_deduction;
    const net_profit = net_freight - loading_charge - unloading_charge - diesel_amount - driver_payment - miscellaneous;

    // Pre-flight: wallet must cover the expense delta. The trip's own existing
    // expense debit is going to be replaced, so add it back to the effective balance.
    const oldExpense = (Number(existing.loading_charge) || 0)
      + (Number(existing.unloading_charge) || 0)
      + (Number(existing.diesel_amount) || 0)
      + (Number(existing.driver_payment) || 0)
      + (Number(existing.miscellaneous) || 0);
    if (trip_expense > 0) {
      const wb = await walletBalance();
      const effective = wb + (existing.expense_completed ? oldExpense : 0);
      if (effective < trip_expense) {
        return res.status(400).json({ error: `Wallet balance (₹${effective.toFixed(2)}) is less than the trip's expenses (₹${trip_expense.toFixed(2)}). Top up the wallet first.` });
      }
    }

    const row = await getOne(
      `UPDATE truck_trips SET
         loading_charge=$1, unloading_charge=$2,
         diesel_litres=$3, diesel_rate=$4, diesel_amount=$5,
         driver_payment=$6, miscellaneous=$7,
         net_freight=$8, net_profit=$9,
         expense_completed=TRUE
       WHERE id=$10 RETURNING *`,
      [loading_charge, unloading_charge, diesel_litres, diesel_rate, diesel_amount,
       driver_payment, miscellaneous, net_freight, net_profit, req.params.id]
    );

    await syncWalletDebitForSource(
      'truck_trip_expense', row.id, trip_expense, row.date, `Expenses for trip #${row.id}`,
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
