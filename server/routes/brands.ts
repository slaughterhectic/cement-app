import { Router } from 'express';
import { getAll, query, getOne } from '../db/database';
import { friendlyError } from '../lib/userError';

const router = Router();

// GET /api/brands — all active brands with stock
router.get('/', async (_req, res) => {
  try {
    const brands = await getAll(`
      SELECT cb.*,
        (COALESCE((SELECT SUM(bags) FROM godown_opening_stock WHERE brand_id = cb.id), 0)
         + COALESCE((SELECT SUM(bags) FROM purchases          WHERE brand_id = cb.id), 0)
         - COALESCE((SELECT SUM(bags) FROM sales              WHERE brand_id = cb.id), 0)) as stock
      FROM cement_brands cb WHERE cb.is_active = 1 ORDER BY cb.name
    `);
    res.json(brands);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /api/brands/truck-batches — per (brand, source truck) breakdown for the SaleForm.
// available_bags = purchased on that truck − sales already attributed to that truck (direct)
//                  − unattributed sales spread across trucks FIFO (oldest purchase date first)
router.get('/truck-batches', async (_req, res) => {
  try {
    const rows = await getAll(`
      WITH per_truck AS (
        SELECT brand_id, COALESCE(NULLIF(TRIM(truck_number), ''), '—') AS truck_number,
               SUM(bags)::int AS purchased_bags,
               SUM(bags * (purchase_rate + COALESCE(freight_rate,0)))::float / NULLIF(SUM(bags),0) AS landed_rate,
               MIN(date) AS first_date,
               MAX(date) AS last_date
        FROM purchases
        GROUP BY brand_id, COALESCE(NULLIF(TRIM(truck_number), ''), '—')
      ),
      direct_sold AS (
        SELECT brand_id, COALESCE(NULLIF(TRIM(source_truck_number), ''), '—') AS truck_number,
               SUM(bags)::int AS bags_sold
        FROM sales
        WHERE source_truck_number IS NOT NULL AND TRIM(source_truck_number) <> ''
        GROUP BY brand_id, COALESCE(NULLIF(TRIM(source_truck_number), ''), '—')
      ),
      unattr_per_brand AS (
        SELECT brand_id, COALESCE(SUM(bags), 0)::int AS total_unattr
        FROM sales
        WHERE source_truck_number IS NULL OR TRIM(source_truck_number) = ''
        GROUP BY brand_id
      ),
      after_direct AS (
        SELECT pt.*, GREATEST(0, pt.purchased_bags - COALESCE(ds.bags_sold, 0)) AS remaining_after_direct
        FROM per_truck pt
        LEFT JOIN direct_sold ds USING (brand_id, truck_number)
      ),
      fifo AS (
        SELECT ad.*,
          COALESCE(SUM(ad.remaining_after_direct) OVER (
            PARTITION BY ad.brand_id
            ORDER BY ad.first_date, ad.truck_number
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ), 0) AS cum_start
        FROM after_direct ad
      )
      SELECT
        f.brand_id, f.truck_number, f.purchased_bags, f.landed_rate, f.last_date,
        GREATEST(0,
          f.remaining_after_direct - GREATEST(0,
            LEAST(COALESCE(u.total_unattr, 0) - f.cum_start, f.remaining_after_direct)
          )
        )::int AS available_bags
      FROM fifo f
      LEFT JOIN unattr_per_brand u ON u.brand_id = f.brand_id
      WHERE GREATEST(0,
        f.remaining_after_direct - GREATEST(0,
          LEAST(COALESCE(u.total_unattr, 0) - f.cum_start, f.remaining_after_direct)
        )
      ) > 0
      ORDER BY f.brand_id, f.first_date, f.truck_number
    `);
    res.json(rows.map((r: any) => ({
      brand_id: Number(r.brand_id),
      truck_number: r.truck_number,
      purchased_bags: Number(r.purchased_bags),
      landed_rate: Number(r.landed_rate),
      available_bags: Number(r.available_bags),
      last_date: r.last_date,
    })));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /api/brands/all — all brands including inactive
router.get('/all', async (_req, res) => {
  try {
    const brands = await getAll(`
      SELECT cb.*,
        (COALESCE((SELECT SUM(bags) FROM godown_opening_stock WHERE brand_id = cb.id), 0)
         + COALESCE((SELECT SUM(bags) FROM purchases          WHERE brand_id = cb.id), 0)
         - COALESCE((SELECT SUM(bags) FROM sales              WHERE brand_id = cb.id), 0)) as stock
      FROM cement_brands cb ORDER BY cb.is_active DESC, cb.name
    `);
    res.json(brands);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
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
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
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
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
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
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
