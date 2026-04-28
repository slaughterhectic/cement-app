import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`SELECT * FROM assets ORDER BY date DESC, id DESC`);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
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
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await deleteImprestForSource('assets', Number(req.params.id));
    await query(`DELETE FROM assets WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
