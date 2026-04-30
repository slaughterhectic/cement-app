import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { getAllSettingsMap } from './settings';

const router = Router();

type Settings = { handling_non_trade_per_mt: number; handling_sow_per_mt: number; bilty_per_mt: number };

function handlingRateFor(materialType: string | null | undefined, s: Settings): number {
  if (materialType === 'Non-Trade') return s.handling_non_trade_per_mt;
  if (materialType === 'SOW') return s.handling_sow_per_mt;
  return 0;
}

// eway_status: delivered | expired | risk (<6h) | warning (6-24h) | ok (>=24h) | none (no bill)
function ewayStatusFor(row: any): { eway_status: string; eway_hours_left: number | null } {
  if (row.delivery_status === 'delivered') return { eway_status: 'delivered', eway_hours_left: null };
  if (!row.eway_bill_valid_until) return { eway_status: 'none', eway_hours_left: null };
  const until = new Date(row.eway_bill_valid_until).getTime();
  if (Number.isNaN(until)) return { eway_status: 'none', eway_hours_left: null };
  const now = Date.now();
  const hoursLeft = (until - now) / 3_600_000;
  if (hoursLeft <= 0) return { eway_status: 'expired', eway_hours_left: hoursLeft };
  if (hoursLeft < 6) return { eway_status: 'risk', eway_hours_left: hoursLeft };
  if (hoursLeft < 24) return { eway_status: 'warning', eway_hours_left: hoursLeft };
  return { eway_status: 'ok', eway_hours_left: hoursLeft };
}

function computeTrip(t: any, s: Settings) {
  const qty = Number(t.qty);
  const accFreightRate = Number(t.acc_freight_rate);
  const commissionPct = Number(t.commission_pct);
  const dieselAdvance = Number(t.diesel_advance);
  const cashAdvance = Number(t.cash_advance);

  const acc_amount = qty * accFreightRate;
  const commission_amount = acc_amount * commissionPct / 100;
  const builty_charge = qty * s.bilty_per_mt;
  const handling_rate = handlingRateFor(t.material_type, s);
  const handling_charge = qty * handling_rate;
  const bill_amount = acc_amount + handling_charge;
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
    handling_rate,
    handling_charge,
    bill_amount,
    final_payment,
    ...ewayStatusFor(t),
  };
}

async function loadSettings(): Promise<Settings> {
  const m = await getAllSettingsMap();
  return {
    handling_non_trade_per_mt: m.handling_non_trade_per_mt ?? 17,
    handling_sow_per_mt: m.handling_sow_per_mt ?? 17,
    bilty_per_mt: m.bilty_per_mt ?? 10,
  };
}

const MATERIAL_TYPES = new Set(['Non-Trade', 'SOW', 'Normal']);
function normalizeMaterialType(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  return MATERIAL_TYPES.has(s) ? s : null;
}

const DELIVERY_STATUSES = new Set(['pending', 'in_transit', 'delivered']);
function normalizeDeliveryStatus(v: any): string {
  if (!v) return 'pending';
  const s = String(v).trim();
  return DELIVERY_STATUSES.has(s) ? s : 'pending';
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

    const settings = await loadSettings();
    res.json(rows.map(r => computeTrip(r, settings)));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /rl/trips/eway-alerts — trips with at-risk E-Way Bills (not delivered)
router.get('/eway-alerts', async (_req, res) => {
  try {
    const rows = await getAll(
      `SELECT t.*, o.truck_number, o.owner_name
       FROM rl_trips t
       JOIN rl_truck_owners o ON t.truck_owner_id = o.id
       WHERE t.eway_bill_valid_until IS NOT NULL
         AND (t.delivery_status IS NULL OR t.delivery_status <> 'delivered')
       ORDER BY t.eway_bill_valid_until ASC`
    );
    const settings = await loadSettings();
    const all = rows.map(r => computeTrip(r, settings));
    const atRisk = all.filter((r: any) => ['risk', 'warning', 'expired'].includes(r.eway_status));
    const counts = {
      expired: all.filter((r: any) => r.eway_status === 'expired').length,
      risk: all.filter((r: any) => r.eway_status === 'risk').length,
      warning: all.filter((r: any) => r.eway_status === 'warning').length,
      ok: all.filter((r: any) => r.eway_status === 'ok').length,
    };
    res.json({ atRisk, counts });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /rl/trips
router.post('/', async (req, res) => {
  try {
    const {
      date, builty_number, do_number, truck_owner_id, party_name, location,
      dch_type, material_type, qty, acc_freight_rate, commission_pct, diesel_advance, cash_advance,
      petrol_slip_number, epod_bill_number, difference_rate, remarks,
      eway_bill_number, eway_bill_generated_at, eway_bill_valid_until,
      delivery_status, delivered_at,
    } = req.body;

    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!truck_owner_id) return res.status(400).json({ error: 'Truck owner is required' });
    if (!party_name?.trim()) return res.status(400).json({ error: 'Party name is required' });

    // Non-admin past/future-date entries route through the TransportBook approval queue
    const today = new Date().toISOString().split('T')[0];
    if (req.user?.role !== 'admin' && date !== today) {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name, source)
         VALUES ('rl_trip', $1::jsonb, $2, $3, 'transportbook') RETURNING id`,
        [JSON.stringify(req.body), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    // Fall back to the owner's default commission % when the trip body omits it
    let resolvedCommissionPct = Number(commission_pct);
    if (!Number.isFinite(resolvedCommissionPct)) {
      const owner = await getOne(
        `SELECT commission_pct FROM rl_truck_owners WHERE id=$1`,
        [Number(truck_owner_id)]
      );
      resolvedCommissionPct = Number(owner?.commission_pct);
      if (!Number.isFinite(resolvedCommissionPct)) resolvedCommissionPct = 6.29;
    }

    const row = await getOne(
      `INSERT INTO rl_trips
        (date, builty_number, do_number, truck_owner_id, party_name, location, dch_type, material_type,
         qty, acc_freight_rate, commission_pct, diesel_advance, cash_advance,
         petrol_slip_number, epod_bill_number, difference_rate, remarks,
         eway_bill_number, eway_bill_generated_at, eway_bill_valid_until,
         delivery_status, delivered_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        date,
        builty_number?.trim() || null,
        do_number?.trim() || null,
        Number(truck_owner_id),
        party_name.trim(),
        location?.trim() || null,
        dch_type?.trim() || null,
        normalizeMaterialType(material_type),
        Number(qty) || 0,
        Number(acc_freight_rate) || 0,
        resolvedCommissionPct,
        Number(diesel_advance) || 0,
        Number(cash_advance) || 0,
        petrol_slip_number?.trim() || null,
        epod_bill_number?.trim() || null,
        Number(difference_rate) || 0,
        remarks?.trim() || null,
        eway_bill_number?.trim() || null,
        eway_bill_generated_at || null,
        eway_bill_valid_until || null,
        normalizeDeliveryStatus(delivery_status),
        delivered_at || null,
      ]
    );

    const settings = await loadSettings();
    res.json(computeTrip(row, settings));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// PUT /rl/trips/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      date, builty_number, do_number, truck_owner_id, party_name, location,
      dch_type, material_type, qty, acc_freight_rate, commission_pct, diesel_advance, cash_advance,
      petrol_slip_number, epod_bill_number, difference_rate, remarks,
      eway_bill_number, eway_bill_generated_at, eway_bill_valid_until,
      delivery_status, delivered_at,
    } = req.body;

    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!truck_owner_id) return res.status(400).json({ error: 'Truck owner is required' });
    if (!party_name?.trim()) return res.status(400).json({ error: 'Party name is required' });

    const row = await getOne(
      `UPDATE rl_trips SET
        date=$1, builty_number=$2, do_number=$3, truck_owner_id=$4, party_name=$5,
        location=$6, dch_type=$7, material_type=$8, qty=$9, acc_freight_rate=$10, commission_pct=$11,
        diesel_advance=$12, cash_advance=$13, petrol_slip_number=$14, epod_bill_number=$15,
        difference_rate=$16, remarks=$17,
        eway_bill_number=$18, eway_bill_generated_at=$19, eway_bill_valid_until=$20,
        delivery_status=$21, delivered_at=$22
       WHERE id=$23 RETURNING *`,
      [
        date,
        builty_number?.trim() || null,
        do_number?.trim() || null,
        Number(truck_owner_id),
        party_name.trim(),
        location?.trim() || null,
        dch_type?.trim() || null,
        normalizeMaterialType(material_type),
        Number(qty) || 0,
        Number(acc_freight_rate) || 0,
        Number(commission_pct) ?? 6.29,
        Number(diesel_advance) || 0,
        Number(cash_advance) || 0,
        petrol_slip_number?.trim() || null,
        epod_bill_number?.trim() || null,
        Number(difference_rate) || 0,
        remarks?.trim() || null,
        eway_bill_number?.trim() || null,
        eway_bill_generated_at || null,
        eway_bill_valid_until || null,
        normalizeDeliveryStatus(delivery_status),
        delivered_at || null,
        req.params.id,
      ]
    );
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    const settings = await loadSettings();
    res.json(computeTrip(row, settings));
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
