import { Router } from 'express';
import { getAll, getOne } from '../db/database';
import { friendlyError } from '../lib/userError';
import { backfillGpsRent } from '../lib/gpsRent';
import { getAllSettingsMap } from './settings';

const router = Router();

function handlingRateFor(
  materialType: string | null | undefined,
  nonTrade: number,
  sow: number,
): number {
  if (materialType === 'Non-Trade') return nonTrade;
  if (materialType === 'SOW') return sow;
  return 0;
}

// GET /rl/owners — list distinct owner names with aggregated trucks and trip count
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT
        o.owner_name AS name,
        COUNT(DISTINCT o.id) AS truck_count,
        COALESCE(SUM(
          CASE WHEN o.is_active = 1 THEN 1 ELSE 0 END
        ), 0) AS active_truck_count,
        MAX(o.owner_phone) FILTER (WHERE o.owner_phone IS NOT NULL AND o.owner_phone <> '') AS owner_phone,
        MAX(o.bank_account) FILTER (WHERE o.bank_account IS NOT NULL AND o.bank_account <> '') AS bank_account,
        MAX(o.ifsc_code) FILTER (WHERE o.ifsc_code IS NOT NULL AND o.ifsc_code <> '') AS ifsc_code,
        MAX(o.beneficiary_name) FILTER (WHERE o.beneficiary_name IS NOT NULL AND o.beneficiary_name <> '') AS beneficiary_name,
        MAX(o.pan_number) FILTER (WHERE o.pan_number IS NOT NULL AND o.pan_number <> '') AS pan_number,
        COALESCE((
          SELECT COUNT(*) FROM rl_trips t
          JOIN rl_truck_owners o2 ON t.truck_owner_id = o2.id
          WHERE o2.owner_name = o.owner_name
        ), 0) AS trip_count,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', o2.id,
            'truck_number', o2.truck_number,
            'driver_name', o2.driver_name,
            'is_active', o2.is_active
          ) ORDER BY o2.truck_number)
          FROM rl_truck_owners o2 WHERE o2.owner_name = o.owner_name
        ), '[]'::json) AS trucks
      FROM rl_truck_owners o
      GROUP BY o.owner_name
      ORDER BY o.owner_name
    `);
    res.json(rows.map((r: any) => ({
      ...r,
      truck_count: Number(r.truck_count),
      active_truck_count: Number(r.active_truck_count),
      trip_count: Number(r.trip_count),
    })));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /rl/owners/by-name/:name/ledger — aggregated ledger across all trucks of an owner
router.get('/by-name/:name/ledger', async (req, res) => {
  try {
    const ownerName = req.params.name;
    const trucks = await getAll(
      `SELECT * FROM rl_truck_owners WHERE owner_name = $1 ORDER BY truck_number`,
      [ownerName]
    );
    if (trucks.length === 0) return res.status(404).json({ error: 'Owner not found' });

    await backfillGpsRent();

    const settings = await getAllSettingsMap();
    const handlingNonTrade = settings.handling_non_trade_per_mt ?? 17;
    const handlingSow = settings.handling_sow_per_mt ?? 17;
    const bilty = settings.bilty_per_mt ?? 10;

    const truckIds = trucks.map((t: any) => t.id);

    const trips = await getAll(
      `SELECT t.*, o.truck_number FROM rl_trips t
       JOIN rl_truck_owners o ON t.truck_owner_id = o.id
       WHERE t.truck_owner_id = ANY($1::int[])
       ORDER BY t.date ASC, t.id ASC`,
      [truckIds]
    );

    const gpsDebits = await getAll(
      `SELECT g.id, g.period, g.date, g.amount, g.truck_owner_id, o.truck_number
       FROM rl_gps_rent_debits g
       JOIN rl_truck_owners o ON g.truck_owner_id = o.id
       WHERE g.truck_owner_id = ANY($1::int[])`,
      [truckIds]
    );

    const advances = await getAll(
      `SELECT id, date, amount, remarks FROM rl_owner_advances
       WHERE owner_name = $1 ORDER BY date ASC, id ASC`,
      [ownerName]
    );

    type Entry = { kind: 'trip' | 'gps_rent'; sortKey: string; payload: any; final_payment: number };
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
      const handling_rate = handlingRateFor(t.material_type, handlingNonTrade, handlingSow);
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
        sortKey: `${g.date}-0-${String(g.id).padStart(10, '0')}`,
        final_payment: -amount,
        payload: {
          id: `gps-${g.id}`,
          kind: 'gps_rent',
          date: g.date,
          period: g.period,
          amount,
          truck_number: g.truck_number,
        },
      });
    }

    entries.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));

    const ledger = entries.map((e) => ({ ...e.payload, kind: e.kind }));

    const tripLedger = ledger.filter((r: any) => r.kind !== 'gps_rent');
    const totalTrips = tripLedger.length;
    const totalQty = tripLedger.reduce((s: number, r: any) => s + Number(r.qty || 0), 0);
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
    const totalAdvancePaid = advances.reduce(
      (s: number, a: any) => s + Number(a.amount || 0),
      0
    );

    const primary = trucks[0];
    res.json({
      owner: {
        name: ownerName,
        owner_phone: trucks.find((t: any) => t.owner_phone)?.owner_phone ?? null,
        bank_account: trucks.find((t: any) => t.bank_account)?.bank_account ?? primary.bank_account ?? null,
        ifsc_code: trucks.find((t: any) => t.ifsc_code)?.ifsc_code ?? primary.ifsc_code ?? null,
        beneficiary_name: trucks.find((t: any) => t.beneficiary_name)?.beneficiary_name ?? null,
        pan_number: trucks.find((t: any) => t.pan_number)?.pan_number ?? null,
        trucks: trucks.map((t: any) => ({
          id: t.id,
          truck_number: t.truck_number,
          driver_name: t.driver_name,
          driver_phone: t.driver_phone,
          is_active: t.is_active,
        })),
      },
      ledger,
      advances: advances.map((a: any) => ({
        id: a.id,
        date: a.date,
        amount: Number(a.amount),
        remarks: a.remarks,
      })),
      summary: {
        totalTrips,
        totalQty,
        totalAccAmount,
        totalCommission,
        totalBuiltyCharge,
        totalHandlingCharge,
        totalDieselAdvance,
        totalCashAdvance,
        totalFinalPayment,
        totalGpsRent,
        totalAdvancePaid,
        netOwed: totalFinalPayment - totalGpsRent - totalAdvancePaid,
      },
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
