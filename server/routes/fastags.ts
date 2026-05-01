import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { fastagBalance } from '../lib/walletSync';

const router = Router();

// GET /api/fastags  — list with computed balance
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT f.*,
        COALESCE((SELECT SUM(amount) FILTER (WHERE type='credit') FROM fastag_transactions WHERE fastag_id=f.id),0) AS total_credits,
        COALESCE((SELECT SUM(amount) FILTER (WHERE type='debit')  FROM fastag_transactions WHERE fastag_id=f.id),0) AS total_debits
      FROM fastags f ORDER BY f.is_active DESC, f.name
    `);
    res.json(rows.map((r: any) => ({
      ...r,
      opening_balance: Number(r.opening_balance) || 0,
      total_credits: Number(r.total_credits) || 0,
      total_debits: Number(r.total_debits) || 0,
      balance: (Number(r.opening_balance) || 0) + (Number(r.total_credits) || 0) - (Number(r.total_debits) || 0),
    })));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /api/fastags
router.post('/', async (req, res) => {
  const { name, opening_balance, remarks } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const row = await getOne(
      `INSERT INTO fastags (name, opening_balance, remarks) VALUES ($1,$2,$3) RETURNING *`,
      [name.trim(), Number(opening_balance) || 0, remarks?.trim() || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /api/fastags/:id
router.put('/:id', async (req, res) => {
  const { name, opening_balance, is_active, remarks } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const row = await getOne(
      `UPDATE fastags SET name=$1, opening_balance=$2, is_active=$3, remarks=$4 WHERE id=$5 RETURNING *`,
      [name.trim(), Number(opening_balance) || 0, is_active ? 1 : 0, remarks?.trim() || null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'FastTag not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /api/fastags/:id (admin; cascades transactions)
router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const used = await getOne(`SELECT 1 FROM truck_trips WHERE fastag_id=$1 LIMIT 1`, [req.params.id]);
    if (used) return res.status(400).json({ error: 'FastTag is linked to trips and cannot be deleted' });
    await query(`DELETE FROM fastags WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// GET /api/fastags/:id/transactions
router.get('/:id/transactions', async (req, res) => {
  try {
    const rows = await getAll(`
      SELECT ft.*, t.truck_number
      FROM fastag_transactions ft
      LEFT JOIN truck_trips tt ON ft.source_table='truck_trip' AND tt.id = ft.source_id
      LEFT JOIN trucks t ON t.id = tt.truck_id
      WHERE ft.fastag_id=$1
      ORDER BY ft.date DESC, ft.id DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /api/fastags/:id/credit — top up via bank only
router.post('/:id/credit', async (req, res) => {
  const { date, amount, bank_name, remarks } = req.body;
  if (!date || !amount) return res.status(400).json({ error: 'date and amount are required' });
  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: 'Amount must be > 0' });
  if (!bank_name?.trim()) return res.status(400).json({ error: 'Pick a bank' });
  try {
    // Make sure the FastTag exists.
    const fastag = await getOne(`SELECT id FROM fastags WHERE id=$1`, [req.params.id]);
    if (!fastag) return res.status(404).json({ error: 'FastTag not found' });
    const row = await getOne(
      `INSERT INTO fastag_transactions (fastag_id, date, type, amount, bank_name, source_table, remarks)
       VALUES ($1,$2,'credit',$3,$4,'manual',$5) RETURNING *`,
      [req.params.id, date, amt, bank_name.trim(), remarks?.trim() || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /api/fastags/:id/transactions/:txId (admin)
router.delete('/:id/transactions/:txId', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await query(
      `DELETE FROM fastag_transactions WHERE id=$1 AND fastag_id=$2`,
      [req.params.txId, req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// GET /api/fastags/:id/balance — quick balance lookup for frontend pre-checks
router.get('/:id/balance', async (req, res) => {
  try {
    res.json({ balance: await fastagBalance(Number(req.params.id)) });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
