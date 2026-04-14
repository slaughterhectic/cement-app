import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';

const router = Router();

function computeTripFields(body: any) {
  const quantity             = Number(body.quantity)              || 0;
  const freight_rate         = Number(body.freight_rate)          || 0;
  const loading_charge       = Number(body.loading_charge)        || 0;
  const unloading_charge     = Number(body.unloading_charge)      || 0;
  const advance_litres       = Number(body.advance_litres)        || 0;
  const advance_rate         = Number(body.advance_rate)          || 0;
  const toll_expense         = Number(body.toll_expense)          || 0;
  const diesel_litres        = Number(body.diesel_litres)         || 0;
  const diesel_rate          = Number(body.diesel_rate)           || 0;
  const driver_payment       = Number(body.driver_payment)        || 0;
  const transporter_commission = Number(body.transporter_commission) || 0;
  const miscellaneous        = Number(body.miscellaneous)         || 0;
  const odometer_start       = body.odometer_start ? Number(body.odometer_start) : null;
  const odometer_end         = body.odometer_end   ? Number(body.odometer_end)   : null;

  const advance_deduction    = advance_litres * advance_rate;
  const diesel_amount        = diesel_litres * diesel_rate;
  // Total freight = pure earning; net = after ALL costs
  const total_freight        = quantity * freight_rate;
  const net_freight          = total_freight
    - loading_charge - unloading_charge
    - advance_deduction - toll_expense
    - diesel_amount - driver_payment
    - transporter_commission - miscellaneous;
  const net_profit           = net_freight;   // same — net freight IS net profit
  const total_km             = (odometer_end !== null && odometer_start !== null)
    ? odometer_end - odometer_start : 0;

  return {
    quantity, freight_rate, loading_charge, unloading_charge,
    advance_litres, advance_rate, advance_deduction,
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
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /truck-trips
router.post('/', async (req, res) => {
  try {
    const {
      date, truck_id, driver_id, material_name, load_from, billed_party,
      billed_destination, transporter_id, diesel_from_id, remarks,
    } = req.body;
    if (!date || !truck_id) return res.status(400).json({ error: 'date and truck_id are required' });

    const c = computeTripFields(req.body);

    const row = await getOne(
      `INSERT INTO truck_trips (
        date, truck_id, driver_id, material_name, quantity,
        load_from, billed_party, billed_destination,
        transporter_id, diesel_from_id, transporter_commission,
        freight_rate, loading_charge, unloading_charge,
        advance_litres, advance_rate, advance_deduction,
        toll_expense, diesel_litres, diesel_rate, diesel_amount,
        driver_payment, miscellaneous,
        odometer_start, odometer_end, total_km,
        total_freight, net_freight, net_profit, remarks
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,
        $12,$13,$14,
        $15,$16,$17,
        $18,$19,$20,$21,
        $22,$23,
        $24,$25,$26,
        $27,$28,$29,$30
      ) RETURNING *`,
      [
        date, truck_id, driver_id || null, material_name || null, c.quantity,
        load_from || null, billed_party || null, billed_destination || null,
        transporter_id || null, diesel_from_id || null, c.transporter_commission,
        c.freight_rate, c.loading_charge, c.unloading_charge,
        c.advance_litres, c.advance_rate, c.advance_deduction,
        c.toll_expense, c.diesel_litres, c.diesel_rate, c.diesel_amount,
        c.driver_payment, c.miscellaneous,
        c.odometer_start, c.odometer_end, c.total_km,
        c.total_freight, c.net_freight, c.net_profit, remarks || null,
      ]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// PUT /truck-trips/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      date, truck_id, driver_id, material_name, load_from, billed_party,
      billed_destination, transporter_id, diesel_from_id, remarks,
    } = req.body;
    const c = computeTripFields(req.body);

    const row = await getOne(
      `UPDATE truck_trips SET
        date=$1, truck_id=$2, driver_id=$3, material_name=$4, quantity=$5,
        load_from=$6, billed_party=$7, billed_destination=$8,
        transporter_id=$9, diesel_from_id=$10, transporter_commission=$11,
        freight_rate=$12, loading_charge=$13, unloading_charge=$14,
        advance_litres=$15, advance_rate=$16, advance_deduction=$17,
        toll_expense=$18, diesel_litres=$19, diesel_rate=$20, diesel_amount=$21,
        driver_payment=$22, miscellaneous=$23,
        odometer_start=$24, odometer_end=$25, total_km=$26,
        total_freight=$27, net_freight=$28, net_profit=$29, remarks=$30
      WHERE id=$31 RETURNING *`,
      [
        date, truck_id, driver_id || null, material_name || null, c.quantity,
        load_from || null, billed_party || null, billed_destination || null,
        transporter_id || null, diesel_from_id || null, c.transporter_commission,
        c.freight_rate, c.loading_charge, c.unloading_charge,
        c.advance_litres, c.advance_rate, c.advance_deduction,
        c.toll_expense, c.diesel_litres, c.diesel_rate, c.diesel_amount,
        c.driver_payment, c.miscellaneous,
        c.odometer_start, c.odometer_end, c.total_km,
        c.total_freight, c.net_freight, c.net_profit, remarks || null,
        req.params.id,
      ]
    );
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /truck-trips/:id (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await query('DELETE FROM truck_trips WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
