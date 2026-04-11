import { Router } from 'express';
import { getAll, query, getOne } from '../db/database';

const router = Router();

// GET /api/brands — all active brands with stock
router.get('/', async (_req, res) => {
  try {
    const brands = await getAll(`
      SELECT cb.*,
        (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id), 0)
         - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id), 0)) as stock
      FROM cement_brands cb WHERE cb.is_active = 1 ORDER BY cb.name
    `);
    res.json(brands);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/brands/all — all brands including inactive
router.get('/all', async (_req, res) => {
  try {
    const brands = await getAll(`
      SELECT cb.*,
        (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id), 0)
         - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id), 0)) as stock
      FROM cement_brands cb ORDER BY cb.is_active DESC, cb.name
    `);
    res.json(brands);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/brands
router.post('/', async (req, res) => {
  try {
    const { name, type, manufacturer } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
    const row = await getOne(
      `INSERT INTO cement_brands (name, type, manufacturer, is_active)
       VALUES ($1, $2, $3, 1) RETURNING *`,
      [name.trim(), type, manufacturer?.trim() || null]
    );
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /api/brands/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, type, manufacturer, is_active } = req.body;
    const row = await getOne(
      `UPDATE cement_brands SET name=$1, type=$2, manufacturer=$3, is_active=$4
       WHERE id=$5 RETURNING *`,
      [name.trim(), type, manufacturer?.trim() || null, is_active ?? 1, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Brand not found' });
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/brands/:id
router.delete('/:id', async (req, res) => {
  try {
    const used = await getOne(
      `SELECT 1 FROM purchases WHERE brand_id=$1 UNION SELECT 1 FROM sales WHERE brand_id=$1 LIMIT 1`,
      [req.params.id]
    );
    if (used) return res.status(400).json({ error: 'Brand is used in purchases/sales — deactivate instead of deleting' });
    await query('DELETE FROM cement_brands WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
