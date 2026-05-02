import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { dieselPartyBalance } from '../lib/walletSync';

const router = Router();

// GET /api/rl/diesel-parties — list with computed balance
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT p.*,
        COALESCE((SELECT SUM(amount) FILTER (WHERE type='credit') FROM rl_diesel_transactions WHERE diesel_party_id=p.id),0) AS total_credits,
        COALESCE((SELECT SUM(amount) FILTER (WHERE type='debit')  FROM rl_diesel_transactions WHERE diesel_party_id=p.id),0) AS total_debits
      FROM rl_diesel_parties p ORDER BY p.is_active DESC, p.name
    `);
    res.json(rows.map((r: any) => ({
      ...r,
      opening_balance: Number(r.opening_balance) || 0,
      total_credits: Number(r.total_credits) || 0,
      total_debits: Number(r.total_debits) || 0,
      // Pump owes us when balance > 0 (we paid in advance), we owe pump when balance < 0
      // (trip debits exceed our top-ups). The sign matches the FastTag convention.
      balance: (Number(r.opening_balance) || 0) + (Number(r.total_credits) || 0) - (Number(r.total_debits) || 0),
    })));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /api/rl/diesel-parties
router.post('/', async (req, res) => {
  const { name, phone, opening_balance, remarks } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const row = await getOne(
      `INSERT INTO rl_diesel_parties (name, phone, opening_balance, remarks) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name.trim(), phone?.trim() || null, Number(opening_balance) || 0, remarks?.trim() || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /api/rl/diesel-parties/:id
router.put('/:id', async (req, res) => {
  const { name, phone, opening_balance, is_active, remarks } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const row = await getOne(
      `UPDATE rl_diesel_parties SET name=$1, phone=$2, opening_balance=$3, is_active=$4, remarks=$5 WHERE id=$6 RETURNING *`,
      [name.trim(), phone?.trim() || null, Number(opening_balance) || 0, is_active ? 1 : 0, remarks?.trim() || null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Diesel party not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /api/rl/diesel-parties/:id (admin) — blocked if any trip references it.
router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const used = await getOne(`SELECT 1 FROM rl_trips WHERE diesel_party_id=$1 LIMIT 1`, [req.params.id]);
    if (used) return res.status(400).json({ error: 'Diesel party is linked to trips and cannot be deleted' });
    await query(`DELETE FROM rl_diesel_parties WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// GET /api/rl/diesel-parties/:id/transactions — joined with trip info for context.
router.get('/:id/transactions', async (req, res) => {
  try {
    const rows = await getAll(`
      SELECT dt.*, o.truck_number, o.owner_name
      FROM rl_diesel_transactions dt
      LEFT JOIN rl_trips t ON dt.source_table='rl_trip' AND t.id = dt.source_id
      LEFT JOIN rl_truck_owners o ON o.id = t.truck_owner_id
      WHERE dt.diesel_party_id=$1
      ORDER BY dt.date DESC, dt.id DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /api/rl/diesel-parties/:id/credit — top up via bank or cash. The sign convention
// follows FastTag: a "credit" raises the balance owed to/by the pump (i.e. money paid in).
router.post('/:id/credit', async (req, res) => {
  const { date, amount, mode, bank_name, cash_handler, remarks } = req.body;
  if (!date || !amount) return res.status(400).json({ error: 'date and amount are required' });
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'Amount must be > 0' });
  const m = mode === 'cash' ? 'cash' : 'bank';
  if (m === 'bank' && !bank_name?.trim()) return res.status(400).json({ error: 'Pick a bank' });
  if (m === 'cash' && !cash_handler?.trim()) return res.status(400).json({ error: 'Pick a cash handler' });
  try {
    const party = await getOne(`SELECT id FROM rl_diesel_parties WHERE id=$1`, [req.params.id]);
    if (!party) return res.status(404).json({ error: 'Diesel party not found' });
    const row = await getOne(
      `INSERT INTO rl_diesel_transactions (diesel_party_id, date, type, amount, mode, bank_name, cash_handler, source_table, remarks)
       VALUES ($1,$2,'credit',$3,$4,$5,$6,'manual',$7) RETURNING *`,
      [req.params.id, date, amt, m, m === 'bank' ? bank_name.trim() : null, m === 'cash' ? cash_handler.trim() : null, remarks?.trim() || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /api/rl/diesel-parties/:id/transactions/:txId (admin)
router.delete('/:id/transactions/:txId', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await query(
      `DELETE FROM rl_diesel_transactions WHERE id=$1 AND diesel_party_id=$2`,
      [req.params.txId, req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// GET /api/rl/diesel-parties/:id/balance — quick lookup for frontend pre-checks.
router.get('/:id/balance', async (req, res) => {
  try {
    res.json({ balance: await dieselPartyBalance(Number(req.params.id)) });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
