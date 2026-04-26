import { getOne, query } from '../db/database';

const THROTTLE_MS = 10 * 60 * 1000;
let lastRunAt = 0;
let inFlight: Promise<void> | null = null;

/**
 * Ensure every active truck owner has a GPS-rent debit row for every month from
 * their active_since month up to and including the current month. Idempotent via
 * UNIQUE (truck_owner_id, period).
 *
 * Runs as a single bulk INSERT (one round-trip) so it's safe to call from
 * request paths. Throttled in-process to once per 10 minutes; pass force=true
 * from server startup to bypass.
 */
export async function backfillGpsRent(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastRunAt < THROTTLE_MS) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const setting = await getOne(`SELECT value FROM app_settings WHERE key = 'gps_rent_monthly'`);
    const amount = setting ? Number(setting.value) : 250;
    if (!Number.isFinite(amount) || amount <= 0) {
      lastRunAt = Date.now();
      return;
    }

    await query(
      `INSERT INTO rl_gps_rent_debits (truck_owner_id, period, date, amount)
       SELECT
         o.id,
         to_char(m.month_start, 'YYYY-MM')    AS period,
         to_char(m.month_start, 'YYYY-MM-DD') AS date,
         $1::real                             AS amount
       FROM rl_truck_owners o
       CROSS JOIN LATERAL generate_series(
         date_trunc('month', o.active_since::date),
         date_trunc('month', CURRENT_DATE),
         interval '1 month'
       ) AS m(month_start)
       WHERE o.is_active = 1 AND o.active_since IS NOT NULL
       ON CONFLICT (truck_owner_id, period) DO NOTHING`,
      [amount]
    );

    lastRunAt = Date.now();
  })();

  try {
    await inFlight;
  } finally {
    inFlight = null;
  }
}
