import { Router } from 'express';
import { getAll } from '../db/database';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const stock = await getAll(`
      SELECT cb.id, cb.name, cb.type, cb.manufacturer,
        COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id), 0) as purchased,
        COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id), 0) as sold,
        (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id), 0)
         - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id), 0)) as stock,
        COALESCE((SELECT AVG(purchase_rate) FROM purchases WHERE brand_id = cb.id), 0) as avg_rate,
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
    let pi = 1, si = 1;

    let pWhere = '';
    let sWhere = '';
    if (brand_id) {
      pWhere += ` AND p.brand_id = $${pi++}`; params_p.push(brand_id);
      sWhere += ` AND s.brand_id = $${si++}`; params_s.push(brand_id);
    }
    if (godown_id) {
      pWhere += ` AND p.godown_id = $${pi++}`; params_p.push(godown_id);
      sWhere += ` AND s.godown_id = $${si++}`; params_s.push(godown_id);
    }

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

    const combined = [...purchases, ...sales].sort((a: any, b: any) => b.date.localeCompare(a.date));
    res.json(combined);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/godown-profit', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT g.id, g.name,
        COALESCE((SELECT SUM(purchase_amount) FROM purchases WHERE godown_id = g.id), 0) as total_purchase,
        COALESCE((SELECT SUM(sale_amount) FROM sales WHERE godown_id = g.id), 0) as total_sale
      FROM godowns g
      ORDER BY g.name
    `);
    const result = rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      total_purchase: Number(r.total_purchase),
      total_sale: Number(r.total_sale),
      profit: Number(r.total_sale) - Number(r.total_purchase),
    }));
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/godown', async (_req, res) => {
  try {
    const stock = await getAll(`
      SELECT g.id, g.name, g.location, cb.id as brand_id, cb.name as brand_name, cb.type as brand_type,
        (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id AND godown_id = g.id), 0)
         - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id AND godown_id = g.id), 0)) as stock
      FROM godowns g CROSS JOIN cement_brands cb
      WHERE cb.is_active = 1
      AND (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id AND godown_id = g.id), 0)
           - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id AND godown_id = g.id), 0)) > 0
      ORDER BY g.name, cb.name
    `);
    res.json(stock);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
