import { getAll, getOne, query } from '../db/database';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth(ymd: string): string {
  // ymd is YYYY-MM-DD
  return `${ymd.slice(0, 7)}-01`;
}

function nextMonthStart(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Ensure every active truck owner has a GPS-rent debit row for every month from
 * their active_since month up to and including the current month. Idempotent via
 * UNIQUE (truck_owner_id, period).
 */
export async function backfillGpsRent(): Promise<void> {
  const setting = await getOne(`SELECT value FROM app_settings WHERE key = 'gps_rent_monthly'`);
  const amount = setting ? Number(setting.value) : 250;
  if (!Number.isFinite(amount) || amount <= 0) return;

  const owners = await getAll(
    `SELECT id, active_since FROM rl_truck_owners
     WHERE is_active = 1 AND active_since IS NOT NULL`
  );

  const today = todayISO();
  const currentMonth = today.slice(0, 7);

  for (const o of owners) {
    let cursor = firstOfMonth(String(o.active_since));
    // Don't go beyond the current month
    while (cursor.slice(0, 7) <= currentMonth) {
      const period = cursor.slice(0, 7);
      await query(
        `INSERT INTO rl_gps_rent_debits (truck_owner_id, period, date, amount)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (truck_owner_id, period) DO NOTHING`,
        [o.id, period, cursor, amount]
      );
      cursor = nextMonthStart(cursor);
    }
  }
}
