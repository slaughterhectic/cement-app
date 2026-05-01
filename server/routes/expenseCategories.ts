import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/expense-categories — public (needed in forms before login check)
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll('SELECT id, name, sort_order FROM expense_categories ORDER BY sort_order, name');
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /api/expense-categories — admin only
router.post('/', authMiddleware, async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const maxOrder = await getOne('SELECT COALESCE(MAX(sort_order), 0) as m FROM expense_categories');
    const row = await getOne(
      'INSERT INTO expense_categories (name, sort_order) VALUES ($1, $2) RETURNING *',
      [name.trim(), Number(maxOrder?.m ?? 0) + 10]
    );
    res.json(row);
  } catch (e: any) {
    if (e.code === '23505') return res.status(400).json({ error: 'Category already exists' });
    res.status(500).json({ error: friendlyError(e) });
  }
});

// DELETE /api/expense-categories/:id — admin only
router.delete('/:id', authMiddleware, async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await query('DELETE FROM expense_categories WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
