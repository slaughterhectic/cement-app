import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

function computeTrip(t: any) {
  const qty = Number(t.qty);
  const accFreightRate = Number(t.acc_freight_rate);
  const commissionPct = Number(t.commission_pct);
  const dieselAdvance = Number(t.diesel_advance);
  const cashAdvance = Number(t.cash_advance);

  const acc_amount = qty * accFreightRate;
  const commission_amount = acc_amount * commissionPct / 100;
  const builty_charge = qty * 10;
  const final_payment = acc_amount - commission_amount - builty_charge - dieselAdvance - cashAdvance;

  return {
    ...t,
    qty,
    acc_freight_rate: accFreightRate,
    commission_pct: commissionPct,
    diesel_advance: dieselAdvance,
    cash_advance: cashAdvance,
    acc_amount,
    commission_amount,
    builty_charge,
    final_payment,
  };
}

// GET /rl/trips — list with optional filters
router.get('/', async (req, res) => {
  try {
    const { truck_owner_id, month } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (truck_owner_id) {
      conditions.push(`t.truck_owner_id = $${idx++}`);
      params.push(Number(truck_owner_id));
    }
    if (month) {
      conditions.push(`t.date LIKE $${idx++}`);
      params.push(`${month}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await getAll(
      `SELECT t.*, o.truck_number, o.owner_name, o.driver_name
       FROM rl_trips t
       JOIN rl_truck_owners o ON t.truck_owner_id = o.id
       ${where}
       ORDER BY t.date DESC, t.id DESC`,
      params
    );

    res.json(rows.map(computeTrip));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /rl/trips
router.post('/', async (req, res) => {
  try {
    const {
      date, builty_number, do_number, truck_owner_id, party_name, location,
      dch_type, qty, acc_freight_rate, commission_pct, diesel_advance, cash_advance,
      petrol_slip_number, epod_bill_number, difference_rate, remarks,
    } = req.body;

    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!truck_owner_id) return res.status(400).json({ error: 'Truck owner is required' });
    if (!party_name?.trim()) return res.status(400).json({ error: 'Party name is required' });

    const row = await getOne(
      `INSERT INTO rl_trips
        (date, builty_number, do_number, truck_owner_id, party_name, location, dch_type,
         qty, acc_freight_rate, commission_pct, diesel_advance, cash_advance,
         petrol_slip_number, epod_bill_number, difference_rate, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        date,
        builty_number?.trim() || null,
        do_number?.trim() || null,
        Number(truck_owner_id),
        party_name.trim(),
        location?.trim() || null,
        dch_type?.trim() || null,
        Number(qty) || 0,
        Number(acc_freight_rate) || 0,
        Number(commission_pct) ?? 6.29,
        Number(diesel_advance) || 0,
        Number(cash_advance) || 0,
        petrol_slip_number?.trim() || null,
        epod_bill_number?.trim() || null,
        Number(difference_rate) || 0,
        remarks?.trim() || null,
      ]
    );

    res.json(computeTrip(row));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// PUT /rl/trips/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      date, builty_number, do_number, truck_owner_id, party_name, location,
      dch_type, qty, acc_freight_rate, commission_pct, diesel_advance, cash_advance,
      petrol_slip_number, epod_bill_number, difference_rate, remarks,
    } = req.body;

    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!truck_owner_id) return res.status(400).json({ error: 'Truck owner is required' });
    if (!party_name?.trim()) return res.status(400).json({ error: 'Party name is required' });

    const row = await getOne(
      `UPDATE rl_trips SET
        date=$1, builty_number=$2, do_number=$3, truck_owner_id=$4, party_name=$5,
        location=$6, dch_type=$7, qty=$8, acc_freight_rate=$9, commission_pct=$10,
        diesel_advance=$11, cash_advance=$12, petrol_slip_number=$13, epod_bill_number=$14,
        difference_rate=$15, remarks=$16
       WHERE id=$17 RETURNING *`,
      [
        date,
        builty_number?.trim() || null,
        do_number?.trim() || null,
        Number(truck_owner_id),
        party_name.trim(),
        location?.trim() || null,
        dch_type?.trim() || null,
        Number(qty) || 0,
        Number(acc_freight_rate) || 0,
        Number(commission_pct) ?? 6.29,
        Number(diesel_advance) || 0,
        Number(cash_advance) || 0,
        petrol_slip_number?.trim() || null,
        epod_bill_number?.trim() || null,
        Number(difference_rate) || 0,
        remarks?.trim() || null,
        req.params.id,
      ]
    );
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    res.json(computeTrip(row));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /rl/trips/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM rl_trips WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
