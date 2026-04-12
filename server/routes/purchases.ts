import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { requirePermission } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, brand_id, supplier } = req.query;
    let sql = `
      SELECT p.*, cb.name as brand_name, g.name as godown_name
      FROM purchases p
      LEFT JOIN cement_brands cb ON p.brand_id = cb.id
      LEFT JOIN godowns g ON p.godown_id = g.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (start_date) { sql += ` AND p.date >= $${idx++}`; params.push(start_date); }
    if (end_date) { sql += ` AND p.date <= $${idx++}`; params.push(end_date); }
    if (brand_id) { sql += ` AND p.brand_id = $${idx++}`; params.push(brand_id); }
    if (supplier) { sql += ` AND p.supplier_name ILIKE $${idx++}`; params.push(`%${supplier}%`); }

    sql += ' ORDER BY p.date DESC, p.id DESC';
    const rows = await getAll(sql, params);

    let sumSql = 'SELECT COALESCE(SUM(bags),0) as total_bags, COALESCE(SUM(purchase_amount),0) as total_amount FROM purchases WHERE 1=1';
    const sumParams: any[] = [];
    let si = 1;
    if (start_date) { sumSql += ` AND date >= $${si++}`; sumParams.push(start_date); }
    if (end_date) { sumSql += ` AND date <= $${si++}`; sumParams.push(end_date); }
    const summary = await getOne(sumSql, sumParams);

    res.json({ data: rows, summary });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { date, supplier_name, brand_id, cement_type, bags, purchase_rate, freight_rate, godown_id, truck_number, source_location, invoice_number, remarks } = req.body;
  try {
    const result = await getOne(
      `INSERT INTO purchases (date, supplier_name, brand_id, cement_type, bags, purchase_rate, freight_rate, godown_id, truck_number, source_location, invoice_number, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [date, supplier_name, brand_id, cement_type, bags, purchase_rate, freight_rate || 0, godown_id || null, truck_number, source_location, invoice_number || null, remarks]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { date, supplier_name, brand_id, cement_type, bags, purchase_rate, freight_rate, godown_id, truck_number, source_location, invoice_number, remarks } = req.body;
  try {
    const result = await getOne(
      `UPDATE purchases SET date=$1, supplier_name=$2, brand_id=$3, cement_type=$4, bags=$5, purchase_rate=$6, freight_rate=$7, godown_id=$8, truck_number=$9, source_location=$10, invoice_number=$11, remarks=$12
       WHERE id=$13 RETURNING *`,
      [date, supplier_name, brand_id, cement_type, bags, purchase_rate, freight_rate || 0, godown_id || null, truck_number, source_location, invoice_number || null, remarks, req.params.id]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', requirePermission('delete_purchases'), async (req, res) => {
  try {
    await query('DELETE FROM purchases WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.get('/suppliers', async (_req, res) => {
  try {
    const rows = await getAll('SELECT DISTINCT supplier_name FROM purchases ORDER BY supplier_name');
    res.json(rows.map((s: any) => s.supplier_name));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/purchases/rates/:brandId — distinct landed rates + total brand stock
router.get('/rates/:brandId', async (req, res) => {
  try {
    const rates = await getAll(`
      SELECT
        p.purchase_rate + COALESCE(p.freight_rate, 0) as landed_rate,
        p.purchase_rate,
        COALESCE(p.freight_rate, 0) as freight_rate,
        SUM(p.bags) as purchased_bags,
        MAX(p.date) as last_date
      FROM purchases p WHERE p.brand_id = $1
      GROUP BY p.purchase_rate, p.freight_rate
      ORDER BY landed_rate DESC
    `, [req.params.brandId]);

    // Total stock for this brand = all purchased - all sold
    const stockRow = await getOne(`
      SELECT
        COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = $1), 0)
        - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = $1), 0) as total_stock
    `, [req.params.brandId]);

    res.json({ rates, totalStock: Number(stockRow?.total_stock ?? 0) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
