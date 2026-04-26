import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { backfillGpsRent } from '../lib/gpsRent';
import { getAllSettingsMap } from './settings';

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

    // Make sure GPS rent debits are up-to-date before reading the ledger
    await backfillGpsRent();

    const settings = await getAllSettingsMap();
    const handlingNonTrade = settings.handling_non_trade_per_mt ?? 17;
    const handlingSow = settings.handling_sow_per_mt ?? 17;
    const bilty = settings.bilty_per_mt ?? 10;

    const trips = await getAll(
      `SELECT * FROM rl_trips WHERE truck_owner_id=$1 ORDER BY date ASC, id ASC`,
      [req.params.id]
    );
    const gpsDebits = await getAll(
      `SELECT id, period, date, amount FROM rl_gps_rent_debits WHERE truck_owner_id=$1`,
      [req.params.id]
    );

    type Entry = {
      kind: 'trip' | 'gps_rent';
      sortKey: string;
      payload: any;
      final_payment: number;
    };
    const entries: Entry[] = [];

    for (const t of trips) {
      const qty = Number(t.qty);
      const accFreightRate = Number(t.acc_freight_rate);
      const commissionPct = Number(t.commission_pct);
      const dieselAdvance = Number(t.diesel_advance);
      const cashAdvance = Number(t.cash_advance);

      const acc_amount = qty * accFreightRate;
      const commission_amount = acc_amount * commissionPct / 100;
      const builty_charge = qty * bilty;
      const handling_rate = t.material_type === 'Non-Trade'
        ? handlingNonTrade
        : t.material_type === 'SOW' ? handlingSow : 0;
      const handling_charge = qty * handling_rate;
      const bill_amount = acc_amount + handling_charge;
      const final_payment = acc_amount - commission_amount - builty_charge - dieselAdvance - cashAdvance;

      entries.push({
        kind: 'trip',
        sortKey: `${t.date}-1-${String(t.id).padStart(10, '0')}`,
        final_payment,
        payload: {
          ...t,
          qty,
          acc_freight_rate: accFreightRate,
          commission_pct: commissionPct,
          diesel_advance: dieselAdvance,
          cash_advance: cashAdvance,
          acc_amount,
          commission_amount,
          builty_charge,
          handling_rate,
          handling_charge,
          bill_amount,
          final_payment,
        },
      });
    }

    for (const g of gpsDebits) {
      const amount = Number(g.amount);
      entries.push({
        kind: 'gps_rent',
        // GPS debits sort before trips on the same date (sort key 0 < 1)
        sortKey: `${g.date}-0-${String(g.id).padStart(10, '0')}`,
        final_payment: -amount,
        payload: {
          id: `gps-${g.id}`,
          kind: 'gps_rent',
          date: g.date,
          period: g.period,
          amount,
        },
      });
    }

    entries.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));

    const ledger = entries.map((e) => ({ ...e.payload, kind: e.kind }));

    const tripLedger = ledger.filter((r: any) => r.kind !== 'gps_rent');
    const totalTrips = tripLedger.length;
    const totalAccAmount = tripLedger.reduce((s: number, r: any) => s + r.acc_amount, 0);
    const totalCommission = tripLedger.reduce((s: number, r: any) => s + r.commission_amount, 0);
    const totalBuiltyCharge = tripLedger.reduce((s: number, r: any) => s + r.builty_charge, 0);
    const totalHandlingCharge = tripLedger.reduce((s: number, r: any) => s + (r.handling_charge || 0), 0);
    const totalDieselAdvance = tripLedger.reduce((s: number, r: any) => s + r.diesel_advance, 0);
    const totalCashAdvance = tripLedger.reduce((s: number, r: any) => s + r.cash_advance, 0);
    const totalFinalPayment = tripLedger.reduce((s: number, r: any) => s + r.final_payment, 0);
    const totalGpsRent = ledger
      .filter((r: any) => r.kind === 'gps_rent')
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

    res.json({
      owner,
      ledger,
      summary: {
        totalTrips,
        totalAccAmount,
        totalCommission,
        totalBuiltyCharge,
        totalHandlingCharge,
        totalDieselAdvance,
        totalCashAdvance,
        totalFinalPayment,
        totalGpsRent,
        netOwed: totalFinalPayment - totalGpsRent,
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

    const today = new Date().toISOString().slice(0, 10);
    const row = await getOne(
      `INSERT INTO rl_truck_owners
        (truck_number, owner_name, owner_phone, driver_name, driver_phone, bank_account, ifsc_code, beneficiary_name, pan_number, active_since)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
        today,
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

    // Handle is_active transition: when going 0→1, set active_since = today so GPS
    // rent starts from this month (without touching it on other edits).
    const prev = await getOne('SELECT is_active FROM rl_truck_owners WHERE id=$1', [req.params.id]);
    if (!prev) return res.status(404).json({ error: 'Truck owner not found' });
    const nextActive = is_active !== undefined ? Number(is_active) : 1;
    const wasActive = Number(prev.is_active);
    const today = new Date().toISOString().slice(0, 10);
    const shouldResetActiveSince = wasActive === 0 && nextActive === 1;

    const row = shouldResetActiveSince
      ? await getOne(
          `UPDATE rl_truck_owners SET
            truck_number=$1, owner_name=$2, owner_phone=$3, driver_name=$4, driver_phone=$5,
            bank_account=$6, ifsc_code=$7, beneficiary_name=$8, pan_number=$9, is_active=$10,
            active_since=$11
           WHERE id=$12 RETURNING *`,
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
            nextActive,
            today,
            req.params.id,
          ]
        )
      : await getOne(
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
            nextActive,
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
