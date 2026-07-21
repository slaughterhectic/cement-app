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
// FIFO runs per purchase ROW (load), not per truck: truck numbers are reused for months,
// so a fresh load on an old truck number must not be swallowed by that truck's history.
// Per row: bags − direct sales tagged to that truck (consuming its own oldest rows first).
// Deliberately does NOT also subtract brand-wide untagged/legacy sales against every
// truck's history — for brands with a lot of untagged historical sales that FIFO
// assumption zeroed out trucks that still physically have stock. The authoritative
// cap on how much can actually be sold is the brand-level stock guard in sales.ts;
// this endpoint only has to be a reasonable, non-misleading picker.
// A truck is listed while any of its rows still has bags; landed_rate/suppliers reflect the remaining rows.
router.get('/truck-batches', async (_req, res) => {
  try {
    const rows = await getAll(`
      WITH prow AS (
        SELECT id, brand_id, COALESCE(NULLIF(TRIM(truck_number), ''), '—') AS truck_number,
               date, bags::numeric AS bags,
               (purchase_rate + COALESCE(freight_rate,0))::numeric AS landed_rate,
               NULLIF(TRIM(supplier_name), '') AS supplier_name
        FROM purchases
      ),
      direct_sold AS (
        SELECT brand_id, COALESCE(NULLIF(TRIM(source_truck_number), ''), '—') AS truck_number,
               SUM(bags)::numeric AS bags_sold
        FROM sales
        WHERE source_truck_number IS NOT NULL AND TRIM(source_truck_number) <> ''
        GROUP BY brand_id, COALESCE(NULLIF(TRIM(source_truck_number), ''), '—')
      ),
      tcum AS (
        SELECT p.*, COALESCE(SUM(p.bags) OVER (
          PARTITION BY p.brand_id, p.truck_number ORDER BY p.date, p.id
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ), 0) AS truck_cum
        FROM prow p
      ),
      final AS (
        SELECT t.*, GREATEST(0, t.bags - GREATEST(0, LEAST(COALESCE(ds.bags_sold, 0) - t.truck_cum, t.bags))) AS avail
        FROM tcum t
        LEFT JOIN direct_sold ds USING (brand_id, truck_number)
      )
      SELECT brand_id, truck_number,
        SUM(bags)::int AS purchased_bags,
        SUM(avail)::int AS available_bags,
        (SUM(landed_rate * avail) / NULLIF(SUM(avail), 0))::float AS landed_rate,
        MAX(date) FILTER (WHERE avail > 0) AS last_date,
        STRING_AGG(DISTINCT supplier_name, ', ') FILTER (WHERE avail > 0) AS supplier_names
      FROM final
      GROUP BY brand_id, truck_number
      HAVING SUM(avail) > 0
      ORDER BY brand_id, MIN(date) FILTER (WHERE avail > 0), truck_number
    `);
    res.json(rows.map((r: any) => ({
      brand_id: Number(r.brand_id),
      truck_number: r.truck_number,
      purchased_bags: Number(r.purchased_bags),
      landed_rate: Number(r.landed_rate),
      available_bags: Number(r.available_bags),
      last_date: r.last_date,
      supplier_names: r.supplier_names ?? null,
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
