import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

// GET /rl/owner-advances?owner_name=NAME — list advances for an owner
router.get('/', async (req, res) => {
  try {
    const ownerName = (req.query.owner_name as string | undefined)?.trim();
    if (!ownerName) return res.status(400).json({ error: 'owner_name is required' });
    const rows = await getAll(
      `SELECT * FROM rl_owner_advances WHERE owner_name = $1 ORDER BY date ASC, id ASC`,
      [ownerName]
    );
    res.json(rows.map((r: any) => ({ ...r, amount: Number(r.amount) })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /rl/owner-advances — body: { owner_name, date, amount, remarks }
router.post('/', async (req, res) => {
  try {
    const { owner_name, date, amount, remarks } = req.body;
    if (!owner_name?.trim()) return res.status(400).json({ error: 'Owner name is required' });
    if (!date) return res.status(400).json({ error: 'Date is required' });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    // Validate the owner exists in rl_truck_owners — keeps advances tied to a real owner
    const owner = await getOne(
      `SELECT 1 FROM rl_truck_owners WHERE owner_name = $1 LIMIT 1`,
      [owner_name.trim()]
    );
    if (!owner) return res.status(400).json({ error: 'Owner not found' });

    const row = await getOne(
      `INSERT INTO rl_owner_advances (owner_name, date, amount, remarks)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [owner_name.trim(), date, amt, remarks?.trim() || null]
    );
    res.json({ ...row, amount: Number(row.amount) });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /rl/owner-advances/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM rl_owner_advances WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
