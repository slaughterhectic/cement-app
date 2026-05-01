import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { requirePermission } from '../middleware/auth';

const router = Router();

const EDITABLE_KEYS = new Set([
  'handling_non_trade_per_mt',
  'handling_sow_per_mt',
  'bilty_per_mt',
  'gps_rent_monthly',
]);

router.get('/', async (_req, res) => {
  try {
    const rows = await getAll('SELECT key, value FROM app_settings ORDER BY key');
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    res.json(out);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.put('/:key', requirePermission('manage_transport_rates'), async (req, res) => {
  try {
    const key = String(req.params.key);
    if (!EDITABLE_KEYS.has(key)) return res.status(400).json({ error: 'Unknown setting' });
    const { value } = req.body;
    if (value === undefined || value === null || value === '') {
      return res.status(400).json({ error: 'value is required' });
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      return res.status(400).json({ error: 'value must be a non-negative number' });
    }
    await query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, String(num)]
    );
    const row = await getOne('SELECT key, value FROM app_settings WHERE key = $1', [key]);
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const row = await getOne('SELECT value FROM app_settings WHERE key = $1', [key]);
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export async function getAllSettingsMap(): Promise<Record<string, number>> {
  const rows = await getAll('SELECT key, value FROM app_settings');
  const out: Record<string, number> = {};
  for (const r of rows) {
    const n = Number(r.value);
    if (Number.isFinite(n)) out[r.key] = n;
  }
  return out;
}

export default router;
