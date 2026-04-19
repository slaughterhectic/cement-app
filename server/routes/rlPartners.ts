import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

// GET /rl/partners — list with computed balance
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT p.*,
        COALESCE((SELECT SUM(amount) FROM rl_partner_transactions WHERE partner_id=p.id AND type='capital'),0) AS total_capital,
        COALESCE((SELECT SUM(amount) FROM rl_partner_transactions WHERE partner_id=p.id AND type='profit'),0) AS total_profit,
        COALESCE((SELECT SUM(amount) FROM rl_partner_transactions WHERE partner_id=p.id AND type='withdrawal'),0) AS total_withdrawals
      FROM rl_partners p ORDER BY p.id
    `);
    res.json(rows.map((r: any) => {
      const openingCapital = Number(r.opening_capital) || 0;
      const totalCapital = Number(r.total_capital) || 0;
      const totalProfit = Number(r.total_profit) || 0;
      const totalWithdrawals = Number(r.total_withdrawals) || 0;
      const balance = openingCapital + totalCapital + totalProfit - totalWithdrawals;
      return {
        ...r,
        opening_capital: openingCapital,
        total_capital: totalCapital,
        total_profit: totalProfit,
        total_withdrawals: totalWithdrawals,
        balance,
      };
    }));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /rl/partners
router.post('/', async (req, res) => {
  try {
    const { name, opening_capital } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const row = await getOne(
      `INSERT INTO rl_partners (name, opening_capital) VALUES ($1,$2) RETURNING *`,
      [name.trim(), Number(opening_capital) || 0]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// PUT /rl/partners/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, opening_capital } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const row = await getOne(
      `UPDATE rl_partners SET name=$1, opening_capital=$2 WHERE id=$3 RETURNING *`,
      [name.trim(), Number(opening_capital) || 0, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Partner not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /rl/partners/:id
router.delete('/:id', async (req, res) => {
  try {
    const used = await getOne(
      'SELECT 1 FROM rl_partner_transactions WHERE partner_id=$1 LIMIT 1',
      [req.params.id]
    );
    if (used) return res.status(400).json({ error: 'Partner has transactions and cannot be deleted' });
    await query('DELETE FROM rl_partners WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// GET /rl/partners/:id/transactions
router.get('/:id/transactions', async (req, res) => {
  try {
    const rows = await getAll(
      `SELECT * FROM rl_partner_transactions WHERE partner_id=$1 ORDER BY date ASC, id ASC`,
      [req.params.id]
    );
    res.json(rows.map((r: any) => ({ ...r, amount: Number(r.amount) })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /rl/partners/:id/transactions
router.post('/:id/transactions', async (req, res) => {
  try {
    const { date, type, amount, remarks } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!type) return res.status(400).json({ error: 'Type is required' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const row = await getOne(
      `INSERT INTO rl_partner_transactions (date, partner_id, type, amount, remarks)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [date, req.params.id, type, Number(amount), remarks?.trim() || null]
    );
    res.json({ ...row, amount: Number(row.amount) });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /rl/partners/:id/transactions/:txId
router.delete('/:id/transactions/:txId', async (req, res) => {
  try {
    await query(
      'DELETE FROM rl_partner_transactions WHERE id=$1 AND partner_id=$2',
      [req.params.txId, req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
