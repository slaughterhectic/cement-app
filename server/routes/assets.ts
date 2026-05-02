import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT a.*,
        COALESCE((SELECT SUM(amount) FROM asset_topups WHERE asset_id = a.id), 0) AS topups_total,
        COALESCE((SELECT COUNT(*)    FROM asset_topups WHERE asset_id = a.id), 0) AS topups_count
      FROM assets a
      ORDER BY a.date DESC, a.id DESC
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.post('/', async (req, res) => {
  const { date, name, type, amount, mode, bank_name, cash_handler, remarks } = req.body;
  if (!date || !name || !amount) {
    return res.status(400).json({ error: 'date, name and amount are required' });
  }
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'amount must be > 0' });
  const normalizedMode = mode === 'cash' ? 'cash' : 'bank';
  const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
  const bank = normalizedMode === 'bank' ? (bank_name || null) : null;
  if (normalizedMode === 'cash' && !handler) {
    return res.status(400).json({ error: 'Select a cash handler' });
  }

  try {
    const row = await getOne(
      `INSERT INTO assets (date, name, type, amount, mode, bank_name, cash_handler, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [date, name.trim(), type || null, amt, normalizedMode, bank, handler, remarks || null]
    );

    await syncImprestForCashTxn({
      sourceTable: 'assets',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: amt,
      date,
      particulars: `Asset purchase — ${name.trim()}`,
      narration: remarks || null,
    });

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.put('/:id', async (req, res) => {
  const { date, name, type, amount, mode, bank_name, cash_handler, remarks } = req.body;
  if (!date || !name || !amount) return res.status(400).json({ error: 'date, name and amount are required' });
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'amount must be > 0' });
  const normalizedMode = mode === 'cash' ? 'cash' : 'bank';
  const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
  const bank = normalizedMode === 'bank' ? (bank_name || null) : null;
  if (normalizedMode === 'cash' && !handler) return res.status(400).json({ error: 'Select a cash handler' });

  try {
    const row = await getOne(
      `UPDATE assets
         SET date=$1, name=$2, type=$3, amount=$4, mode=$5, bank_name=$6, cash_handler=$7, remarks=$8
       WHERE id=$9 RETURNING *`,
      [date, name.trim(), type || null, amt, normalizedMode, bank, handler, remarks || null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Asset not found' });

    // Re-sync imprest — UPSERT-by-source handles edits cleanly and removes the row
    // when the asset switches to bank mode or the handler is cleared.
    await syncImprestForCashTxn({
      sourceTable: 'assets',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: amt,
      date,
      particulars: `Asset purchase — ${name.trim()}`,
      narration: remarks || null,
    });

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    // Clean up imprest entries for any top-ups before the FK cascade drops the rows.
    const topups = await getAll(`SELECT id FROM asset_topups WHERE asset_id=$1`, [req.params.id]);
    for (const t of topups as any[]) {
      await deleteImprestForSource('asset_topups', Number(t.id));
    }
    await deleteImprestForSource('assets', Number(req.params.id));
    await query(`DELETE FROM assets WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// ---- Top-ups (additional investment into an existing asset) ----

router.get('/:id/topups', async (req, res) => {
  try {
    const rows = await getAll(
      `SELECT * FROM asset_topups WHERE asset_id=$1 ORDER BY date DESC, id DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.post('/:id/topups', async (req, res) => {
  const assetId = Number(req.params.id);
  const { date, amount, mode, bank_name, cash_handler, remarks } = req.body;
  if (!date || !amount) return res.status(400).json({ error: 'date and amount are required' });
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'amount must be > 0' });
  const normalizedMode = mode === 'cash' ? 'cash' : 'bank';
  const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
  const bank = normalizedMode === 'bank' ? (bank_name || null) : null;
  if (normalizedMode === 'cash' && !handler) return res.status(400).json({ error: 'Select a cash handler' });

  try {
    const asset = await getOne(`SELECT id, name FROM assets WHERE id=$1`, [assetId]);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const row = await getOne(
      `INSERT INTO asset_topups (asset_id, date, amount, mode, bank_name, cash_handler, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [assetId, date, amt, normalizedMode, bank, handler, remarks || null]
    );

    await syncImprestForCashTxn({
      sourceTable: 'asset_topups',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: amt,
      date,
      particulars: `Asset top-up — ${asset.name}`,
      narration: remarks || null,
    });

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.put('/:id/topups/:topupId', async (req, res) => {
  const assetId = Number(req.params.id);
  const topupId = Number(req.params.topupId);
  const { date, amount, mode, bank_name, cash_handler, remarks } = req.body;
  if (!date || !amount) return res.status(400).json({ error: 'date and amount are required' });
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'amount must be > 0' });
  const normalizedMode = mode === 'cash' ? 'cash' : 'bank';
  const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
  const bank = normalizedMode === 'bank' ? (bank_name || null) : null;
  if (normalizedMode === 'cash' && !handler) return res.status(400).json({ error: 'Select a cash handler' });

  try {
    const asset = await getOne(`SELECT id, name FROM assets WHERE id=$1`, [assetId]);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const row = await getOne(
      `UPDATE asset_topups
         SET date=$1, amount=$2, mode=$3, bank_name=$4, cash_handler=$5, remarks=$6
       WHERE id=$7 AND asset_id=$8 RETURNING *`,
      [date, amt, normalizedMode, bank, handler, remarks || null, topupId, assetId]
    );
    if (!row) return res.status(404).json({ error: 'Top-up not found' });

    await syncImprestForCashTxn({
      sourceTable: 'asset_topups',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: amt,
      date,
      particulars: `Asset top-up — ${asset.name}`,
      narration: remarks || null,
    });

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id/topups/:topupId', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await deleteImprestForSource('asset_topups', Number(req.params.topupId));
    await query(
      `DELETE FROM asset_topups WHERE id=$1 AND asset_id=$2`,
      [req.params.topupId, req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
