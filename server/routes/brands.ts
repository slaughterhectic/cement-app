import { Router } from 'express';
import { getAll } from '../db/database';

const router = Router();

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

export default router;
