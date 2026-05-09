import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { getAllSettingsMap } from './settings';
import { syncDieselDebitForSource, deleteDieselForSource } from '../lib/walletSync';
import { canEditTransport } from '../lib/transportAuth';

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
    const { truck_owner_id, month, company } = req.query as Record<string, string>;
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
    if (company === 'acc' || company === 'jk') {
      conditions.push(`t.company = $${idx++}`);
      params.push(company);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await getAll(
      `SELECT t.*, o.truck_number, o.owner_name, o.driver_name,
              dp.name AS diesel_party_name
       FROM rl_trips t
       JOIN rl_truck_owners o ON t.truck_owner_id = o.id
       LEFT JOIN rl_diesel_parties dp ON dp.id = t.diesel_party_id
       ${where}
       ORDER BY t.date DESC, t.id DESC`,
      params
    );

    const settings = await loadSettings();
    res.json(rows.map(r => computeTrip(r, settings)));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /rl/trips/eway-alerts — trips with at-risk E-Way Bills (not delivered)
// GET /rl/trips/monthly-growth — last N months (default 12) of trips count and ACC amount
router.get('/monthly-growth', async (req, res) => {
  try {
    const monthsParam = Number((req.query as any).months);
    const months = Number.isFinite(monthsParam) && monthsParam > 0 && monthsParam <= 36 ? Math.floor(monthsParam) : 12;
    const rows = await getAll(`
      WITH months AS (
        SELECT to_char((date_trunc('month', NOW()) - (n || ' months')::interval)::date, 'YYYY-MM') AS ym
        FROM generate_series(0, $1 - 1) AS n
      )
      SELECT m.ym AS month,
        COALESCE(t.trips, 0)::int AS trips,
        COALESCE(t.acc_amount, 0)::float AS acc_amount,
        COALESCE(t.commission, 0)::float AS commission,
        COALESCE(t.bilty, 0)::float AS bilty,
        COALESCE(t.qty, 0)::float AS qty
      FROM months m
      LEFT JOIN (
        SELECT to_char(date::date, 'YYYY-MM') AS ym,
               COUNT(*) AS trips,
               SUM(qty * acc_freight_rate) AS acc_amount,
               SUM(qty * acc_freight_rate * commission_pct / 100) AS commission,
               SUM(qty * COALESCE((SELECT (value)::float FROM app_settings WHERE key='bilty_per_mt'), 10)) AS bilty,
               SUM(qty) AS qty
        FROM rl_trips
        GROUP BY to_char(date::date, 'YYYY-MM')
      ) t ON t.ym = m.ym
      ORDER BY m.ym ASC
    `, [months]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /rl/trips/monthly-pl — last N months P&L (commission income vs expenses)
router.get('/monthly-pl', async (req, res) => {
  try {
    const monthsParam = Number((req.query as any).months);
    const months = Number.isFinite(monthsParam) && monthsParam > 0 && monthsParam <= 36 ? Math.floor(monthsParam) : 12;
    const rows = await getAll(`
      WITH months AS (
        SELECT to_char((date_trunc('month', NOW()) - (n || ' months')::interval)::date, 'YYYY-MM') AS ym
        FROM generate_series(0, $1 - 1) AS n
      )
      SELECT m.ym AS month,
        COALESCE(t.commission, 0)::float AS commission,
        COALESCE(e.expenses, 0)::float    AS expenses,
        (COALESCE(t.commission, 0) - COALESCE(e.expenses, 0))::float AS net_pl
      FROM months m
      LEFT JOIN (
        SELECT to_char(date::date, 'YYYY-MM') AS ym,
               SUM(qty * acc_freight_rate * commission_pct / 100) AS commission
        FROM rl_trips
        GROUP BY to_char(date::date, 'YYYY-MM')
      ) t ON t.ym = m.ym
      LEFT JOIN (
        SELECT to_char(date::date, 'YYYY-MM') AS ym,
               SUM(amount) AS expenses
        FROM rl_expenses
        GROUP BY to_char(date::date, 'YYYY-MM')
      ) e ON e.ym = m.ym
      ORDER BY m.ym ASC
    `, [months]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

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
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /rl/trips
router.post('/', async (req, res) => {
  try {
    const {
      date, builty_number, do_number, truck_owner_id, party_name, location,
      dch_type, material_type, qty, acc_freight_rate, commission_pct, diesel_advance, cash_advance,
      petrol_slip_number, epod_bill_number, difference_rate, remarks,
      eway_bill_number, eway_bill_generated_at, eway_bill_valid_until,
      delivery_status, delivered_at, diesel_party_id, company,
      diesel_receipt_number,
    } = req.body;

    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!truck_owner_id) return res.status(400).json({ error: 'Truck owner is required' });
    if (!party_name?.trim()) return res.status(400).json({ error: 'Party name is required' });

    const tripCompany = (typeof company === 'string' ? company.trim().toLowerCase() : '') || 'acc';
    if (tripCompany !== 'acc' && tripCompany !== 'jk') return res.status(400).json({ error: "company must be 'acc' or 'jk'" });

    // Diesel receipt numbers must be unique across trips — prevents the same pump
    // memo from being entered twice (catches duplicate / fraud cases).
    const drn = diesel_receipt_number?.trim();
    if (drn) {
      const dup = await getOne(
        `SELECT id, builty_number FROM rl_trips WHERE diesel_receipt_number = $1 LIMIT 1`,
        [drn]
      );
      if (dup) {
        return res.status(400).json({ error: `Diesel receipt #${drn} is already used on trip ${dup.builty_number ? `${dup.builty_number} (#${dup.id})` : `#${dup.id}`}.` });
      }
    }

    // All non-editor entries — present or past — go through the TransportBook approval queue.
    if (!await canEditTransport(req)) {
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

    const dieselPartyIdNum = diesel_party_id ? Number(diesel_party_id) : null;
    const dieselAdvanceNum = Number(diesel_advance) || 0;

    const row = await getOne(
      `INSERT INTO rl_trips
        (date, builty_number, do_number, truck_owner_id, party_name, location, dch_type, material_type,
         qty, acc_freight_rate, commission_pct, diesel_advance, cash_advance,
         petrol_slip_number, epod_bill_number, difference_rate, remarks,
         eway_bill_number, eway_bill_generated_at, eway_bill_valid_until,
         delivery_status, delivered_at, diesel_party_id, company, diesel_receipt_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
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
        dieselAdvanceNum,
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
        dieselPartyIdNum,
        tripCompany,
        diesel_receipt_number?.trim() || null,
      ]
    );

    await syncDieselDebitForSource(
      'rl_trip', row.id, dieselPartyIdNum, dieselAdvanceNum, date,
      builty_number?.trim() ? `Trip ${builty_number.trim()}` : `Trip #${row.id}`,
    );

    const settings = await loadSettings();
    res.json(computeTrip(row, settings));
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /rl/trips/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      date, builty_number, do_number, truck_owner_id, party_name, location,
      dch_type, material_type, qty, acc_freight_rate, commission_pct, diesel_advance, cash_advance,
      petrol_slip_number, epod_bill_number, difference_rate, remarks,
      eway_bill_number, eway_bill_generated_at, eway_bill_valid_until,
      delivery_status, delivered_at, diesel_party_id, company,
      diesel_receipt_number,
    } = req.body;

    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!truck_owner_id) return res.status(400).json({ error: 'Truck owner is required' });
    if (!party_name?.trim()) return res.status(400).json({ error: 'Party name is required' });

    const tripCompany = (typeof company === 'string' ? company.trim().toLowerCase() : '') || 'acc';
    if (tripCompany !== 'acc' && tripCompany !== 'jk') return res.status(400).json({ error: "company must be 'acc' or 'jk'" });

    // Diesel receipt uniqueness on edit — exclude the trip we're updating.
    const drn = diesel_receipt_number?.trim();
    if (drn) {
      const dup = await getOne(
        `SELECT id, builty_number FROM rl_trips WHERE diesel_receipt_number = $1 AND id <> $2 LIMIT 1`,
        [drn, req.params.id]
      );
      if (dup) {
        return res.status(400).json({ error: `Diesel receipt #${drn} is already used on trip ${dup.builty_number ? `${dup.builty_number} (#${dup.id})` : `#${dup.id}`}.` });
      }
    }

    const dieselPartyIdNum = diesel_party_id ? Number(diesel_party_id) : null;
    const dieselAdvanceNum = Number(diesel_advance) || 0;

    const row = await getOne(
      `UPDATE rl_trips SET
        date=$1, builty_number=$2, do_number=$3, truck_owner_id=$4, party_name=$5,
        location=$6, dch_type=$7, material_type=$8, qty=$9, acc_freight_rate=$10, commission_pct=$11,
        diesel_advance=$12, cash_advance=$13, petrol_slip_number=$14, epod_bill_number=$15,
        difference_rate=$16, remarks=$17,
        eway_bill_number=$18, eway_bill_generated_at=$19, eway_bill_valid_until=$20,
        delivery_status=$21, delivered_at=$22, diesel_party_id=$23, company=$24,
        diesel_receipt_number=$25
       WHERE id=$26 RETURNING *`,
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
        dieselAdvanceNum,
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
        dieselPartyIdNum,
        tripCompany,
        diesel_receipt_number?.trim() || null,
        req.params.id,
      ]
    );
    if (!row) return res.status(404).json({ error: 'Trip not found' });

    await syncDieselDebitForSource(
      'rl_trip', row.id, dieselPartyIdNum, dieselAdvanceNum, date,
      builty_number?.trim() ? `Trip ${builty_number.trim()}` : `Trip #${row.id}`,
    );

    const settings = await loadSettings();
    res.json(computeTrip(row, settings));
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PATCH /rl/trips/:id/received — toggle the payment-received flag (open to all authed users).
router.patch('/:id/received', async (req, res) => {
  try {
    const { received } = req.body;
    const row = await getOne(
      'UPDATE rl_trips SET received=$1 WHERE id=$2 RETURNING id, received',
      [Boolean(received), req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /rl/trips/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteDieselForSource('rl_trip', Number(req.params.id));
    await query('DELETE FROM rl_trips WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
