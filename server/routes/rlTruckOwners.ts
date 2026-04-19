import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

// GET /rl/truck-owners — list all with trip count
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT t.*,
        COALESCE((SELECT COUNT(*) FROM rl_trips WHERE truck_owner_id = t.id), 0) AS trip_count
      FROM rl_truck_owners t
      ORDER BY t.truck_number
    `);
    res.json(rows.map((r: any) => ({ ...r, trip_count: Number(r.trip_count) })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /rl/truck-owners/:id/ledger — all trips with computed columns
router.get('/:id/ledger', async (req, res) => {
  try {
    const owner = await getOne('SELECT * FROM rl_truck_owners WHERE id=$1', [req.params.id]);
    if (!owner) return res.status(404).json({ error: 'Truck owner not found' });

    const trips = await getAll(
      `SELECT * FROM rl_trips WHERE truck_owner_id=$1 ORDER BY date ASC, id ASC`,
      [req.params.id]
    );

    let runningTotal = 0;
    const ledger = trips.map((t: any) => {
      const qty = Number(t.qty);
      const accFreightRate = Number(t.acc_freight_rate);
      const commissionPct = Number(t.commission_pct);
      const dieselAdvance = Number(t.diesel_advance);
      const cashAdvance = Number(t.cash_advance);

      const acc_amount = qty * accFreightRate;
      const commission_amount = acc_amount * commissionPct / 100;
      const builty_charge = qty * 10;
      const final_payment = acc_amount - commission_amount - builty_charge - dieselAdvance - cashAdvance;

      runningTotal += final_payment;

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
        running_total: runningTotal,
      };
    });

    const totalTrips = trips.length;
    const totalAccAmount = ledger.reduce((s: number, r: any) => s + r.acc_amount, 0);
    const totalCommission = ledger.reduce((s: number, r: any) => s + r.commission_amount, 0);
    const totalBuiltyCharge = ledger.reduce((s: number, r: any) => s + r.builty_charge, 0);
    const totalDieselAdvance = ledger.reduce((s: number, r: any) => s + r.diesel_advance, 0);
    const totalCashAdvance = ledger.reduce((s: number, r: any) => s + r.cash_advance, 0);
    const totalFinalPayment = ledger.reduce((s: number, r: any) => s + r.final_payment, 0);

    res.json({
      owner,
      ledger,
      summary: {
        totalTrips,
        totalAccAmount,
        totalCommission,
        totalBuiltyCharge,
        totalDieselAdvance,
        totalCashAdvance,
        totalFinalPayment,
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /rl/truck-owners
router.post('/', async (req, res) => {
  try {
    const {
      truck_number, owner_name, owner_phone, driver_name, driver_phone,
      bank_account, ifsc_code, beneficiary_name, pan_number,
    } = req.body;
    if (!truck_number?.trim()) return res.status(400).json({ error: 'Truck number is required' });
    if (!owner_name?.trim()) return res.status(400).json({ error: 'Owner name is required' });

    const row = await getOne(
      `INSERT INTO rl_truck_owners
        (truck_number, owner_name, owner_phone, driver_name, driver_phone, bank_account, ifsc_code, beneficiary_name, pan_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        truck_number.trim().toUpperCase(),
        owner_name.trim(),
        owner_phone?.trim() || null,
        driver_name?.trim() || null,
        driver_phone?.trim() || null,
        bank_account?.trim() || null,
        ifsc_code?.trim() || null,
        beneficiary_name?.trim() || null,
        pan_number?.trim() || null,
      ]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// PUT /rl/truck-owners/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      truck_number, owner_name, owner_phone, driver_name, driver_phone,
      bank_account, ifsc_code, beneficiary_name, pan_number, is_active,
    } = req.body;
    if (!truck_number?.trim()) return res.status(400).json({ error: 'Truck number is required' });
    if (!owner_name?.trim()) return res.status(400).json({ error: 'Owner name is required' });

    const row = await getOne(
      `UPDATE rl_truck_owners SET
        truck_number=$1, owner_name=$2, owner_phone=$3, driver_name=$4, driver_phone=$5,
        bank_account=$6, ifsc_code=$7, beneficiary_name=$8, pan_number=$9, is_active=$10
       WHERE id=$11 RETURNING *`,
      [
        truck_number.trim().toUpperCase(),
        owner_name.trim(),
        owner_phone?.trim() || null,
        driver_name?.trim() || null,
        driver_phone?.trim() || null,
        bank_account?.trim() || null,
        ifsc_code?.trim() || null,
        beneficiary_name?.trim() || null,
        pan_number?.trim() || null,
        is_active !== undefined ? Number(is_active) : 1,
        req.params.id,
      ]
    );
    if (!row) return res.status(404).json({ error: 'Truck owner not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /rl/truck-owners/:id
router.delete('/:id', async (req, res) => {
  try {
    const used = await getOne(
      'SELECT 1 FROM rl_trips WHERE truck_owner_id=$1 LIMIT 1',
      [req.params.id]
    );
    if (used) return res.status(400).json({ error: 'Truck owner has trips and cannot be deleted' });
    await query('DELETE FROM rl_truck_owners WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
