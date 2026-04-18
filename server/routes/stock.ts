import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

// Brand-level stock summary (across all godowns).
// Incorporates opening stock and blends its rate into the average.
router.get('/', async (_req, res) => {
  try {
    const stock = await getAll(`
      SELECT cb.id, cb.name, cb.type, cb.manufacturer,
        COALESCE((SELECT SUM(bags) FROM godown_opening_stock WHERE brand_id = cb.id), 0) as opening_bags,
        COALESCE((SELECT SUM(bags) FROM purchases             WHERE brand_id = cb.id), 0) as purchased,
        COALESCE((SELECT SUM(bags) FROM sales                 WHERE brand_id = cb.id), 0) as sold,
        (
          COALESCE((SELECT SUM(bags) FROM godown_opening_stock WHERE brand_id = cb.id), 0)
          + COALESCE((SELECT SUM(bags) FROM purchases          WHERE brand_id = cb.id), 0)
          - COALESCE((SELECT SUM(bags) FROM sales              WHERE brand_id = cb.id), 0)
        ) as stock,
        /* Weighted average rate across opening + purchases */
        (
          (COALESCE((SELECT SUM(bags * rate)          FROM godown_opening_stock WHERE brand_id = cb.id), 0)
         + COALESCE((SELECT SUM(bags * purchase_rate) FROM purchases            WHERE brand_id = cb.id), 0))
          / NULLIF(
              COALESCE((SELECT SUM(bags) FROM godown_opening_stock WHERE brand_id = cb.id), 0)
            + COALESCE((SELECT SUM(bags) FROM purchases            WHERE brand_id = cb.id), 0), 0)
        ) as avg_rate,
        (SELECT date FROM purchases WHERE brand_id = cb.id ORDER BY date DESC LIMIT 1) as last_purchase
      FROM cement_brands cb WHERE cb.is_active = 1 ORDER BY cb.name
    `);
    res.json(stock);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/movement', async (req, res) => {
  try {
    const { brand_id, godown_id } = req.query;
    const params_p: any[] = [];
    const params_s: any[] = [];
    const params_o: any[] = [];
    let pi = 1, si = 1, oi = 1;

    let pWhere = '';
    let sWhere = '';
    let oWhere = '';
    if (brand_id) {
      pWhere += ` AND p.brand_id = $${pi++}`; params_p.push(brand_id);
      sWhere += ` AND s.brand_id = $${si++}`; params_s.push(brand_id);
      oWhere += ` AND o.brand_id = $${oi++}`; params_o.push(brand_id);
    }
    if (godown_id) {
      pWhere += ` AND p.godown_id = $${pi++}`; params_p.push(godown_id);
      sWhere += ` AND s.godown_id = $${si++}`; params_s.push(godown_id);
      oWhere += ` AND o.godown_id = $${oi++}`; params_o.push(godown_id);
    }

    const opening = await getAll(`
      SELECT COALESCE(o.as_of_date, '0000-00-00') as date,
             'Opening' as type, cb.name as brand_name, o.bags as bags_in, 0 as bags_out,
             'Opening stock' as reference, g.name as godown_name, o.brand_id, o.id
      FROM godown_opening_stock o
      JOIN cement_brands cb ON o.brand_id = cb.id
      LEFT JOIN godowns g ON o.godown_id = g.id
      WHERE 1=1 ${oWhere}
    `, params_o);

    const purchases = await getAll(`
      SELECT p.date, 'Purchase' as type, cb.name as brand_name, p.bags as bags_in, 0 as bags_out,
        p.supplier_name as reference, g.name as godown_name, p.brand_id, p.id
      FROM purchases p
      JOIN cement_brands cb ON p.brand_id = cb.id
      LEFT JOIN godowns g ON p.godown_id = g.id
      WHERE 1=1 ${pWhere}
    `, params_p);

    const sales = await getAll(`
      SELECT s.date, 'Sale' as type, cb.name as brand_name, 0 as bags_in, s.bags as bags_out,
        pa.name as reference, g.name as godown_name, s.brand_id, s.id
      FROM sales s
      JOIN cement_brands cb ON s.brand_id = cb.id
      JOIN parties pa ON s.party_id = pa.id
      LEFT JOIN godowns g ON s.godown_id = g.id
      WHERE 1=1 ${sWhere}
    `, params_s);

    const combined = [...opening, ...purchases, ...sales].sort((a: any, b: any) => b.date.localeCompare(a.date));
    res.json(combined);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/godown-profit', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT g.id, g.name,
        COALESCE((SELECT SUM(bags * rate)          FROM godown_opening_stock WHERE godown_id = g.id), 0) as opening_value,
        COALESCE((SELECT SUM(purchase_amount)      FROM purchases            WHERE godown_id = g.id), 0) as total_purchase,
        COALESCE((SELECT SUM(sale_amount)          FROM sales                WHERE godown_id = g.id), 0) as total_sale
      FROM godowns g
      ORDER BY g.name
    `);
    const result = rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      opening_value: Number(r.opening_value),
      total_purchase: Number(r.total_purchase),
      total_sale: Number(r.total_sale),
      // profit = sales - (opening + purchases). Ignores leftover stock value; matches prior behaviour
      // but now also accounts for opening cost-of-goods.
      profit: Number(r.total_sale) - Number(r.total_purchase) - Number(r.opening_value),
    }));
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/godown', async (_req, res) => {
  try {
    const stock = await getAll(`
      SELECT g.id, g.name, g.location, cb.id as brand_id, cb.name as brand_name, cb.type as brand_type,
        (
          COALESCE((SELECT bags FROM godown_opening_stock WHERE brand_id = cb.id AND godown_id = g.id), 0)
        + COALESCE((SELECT SUM(bags) FROM purchases       WHERE brand_id = cb.id AND godown_id = g.id), 0)
        - COALESCE((SELECT SUM(bags) FROM sales           WHERE brand_id = cb.id AND godown_id = g.id), 0)
        ) as stock
      FROM godowns g CROSS JOIN cement_brands cb
      WHERE cb.is_active = 1
      AND (
          COALESCE((SELECT bags FROM godown_opening_stock WHERE brand_id = cb.id AND godown_id = g.id), 0)
        + COALESCE((SELECT SUM(bags) FROM purchases       WHERE brand_id = cb.id AND godown_id = g.id), 0)
        - COALESCE((SELECT SUM(bags) FROM sales           WHERE brand_id = cb.id AND godown_id = g.id), 0)
        ) > 0
      ORDER BY g.name, cb.name
    `);
    res.json(stock);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Opening-stock CRUD ──────────────────────────────────────────────────────

router.get('/opening', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT o.id, o.godown_id, o.brand_id, o.bags, o.rate, o.as_of_date, o.remarks,
             g.name as godown_name, cb.name as brand_name, cb.type as brand_type
      FROM godown_opening_stock o
      JOIN godowns g ON o.godown_id = g.id
      JOIN cement_brands cb ON o.brand_id = cb.id
      ORDER BY g.name, cb.name
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Upsert (one row per godown+brand).
router.post('/opening', async (req, res) => {
  try {
    const { godown_id, brand_id, bags, rate, as_of_date, remarks } = req.body;
    if (!godown_id || !brand_id) return res.status(400).json({ error: 'godown_id and brand_id are required' });
    const b = Number(bags) || 0;
    const r = Number(rate) || 0;
    if (b < 0 || r < 0) return res.status(400).json({ error: 'bags and rate must be non-negative' });

    const row = await getOne(
      `INSERT INTO godown_opening_stock (godown_id, brand_id, bags, rate, as_of_date, remarks)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (godown_id, brand_id) DO UPDATE SET
         bags = EXCLUDED.bags,
         rate = EXCLUDED.rate,
         as_of_date = EXCLUDED.as_of_date,
         remarks = EXCLUDED.remarks
       RETURNING *`,
      [godown_id, brand_id, b, r, as_of_date || null, remarks || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/opening/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await query('DELETE FROM godown_opening_stock WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
