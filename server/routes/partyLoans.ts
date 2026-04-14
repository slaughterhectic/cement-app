import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

// GET /api/party-loans
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT pl.*, p.name as party_name
      FROM party_loans pl
      JOIN parties p ON pl.party_id = p.id
      ORDER BY pl.date DESC, pl.id DESC
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/party-loans
router.post('/', async (req: any, res) => {
  const { date, party_id, amount, mode, bank_name, type, remarks } = req.body;
  if (!date || !party_id || !amount || !type) {
    return res.status(400).json({ error: 'date, party_id, amount, type are required' });
  }
  try {
    const row = await getOne(
      `INSERT INTO party_loans (date, party_id, amount, mode, bank_name, type, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [date, party_id, amount, mode || 'bank', bank_name || null, type, remarks || null]
    );
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/party-loans/:id
router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await query('DELETE FROM party_loans WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
