import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { requirePermission } from '../middleware/auth';

const router = Router();

async function getStock(brandId: number, godownId?: number): Promise<number> {
  if (godownId) {
    const r = await getOne(`
      SELECT COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id=$1 AND godown_id=$2),0)
           - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id=$1 AND godown_id=$2),0) as stock
    `, [brandId, godownId]);
    return Number(r.stock);
  }
  const r = await getOne(`
    SELECT COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id=$1),0)
         - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id=$1),0) as stock
  `, [brandId]);
  return Number(r.stock);
}

router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, party_id, brand_id, month } = req.query;
    let sql = `
      SELECT s.*, p.name as party_name, cb.name as brand_name, g.name as godown_name,
        (SELECT AVG(pu.purchase_rate + COALESCE(pu.freight_rate, 0)) FROM purchases pu WHERE pu.brand_id = s.brand_id) as avg_purchase_rate
      FROM sales s
      JOIN parties p ON s.party_id = p.id
      JOIN cement_brands cb ON s.brand_id = cb.id
      LEFT JOIN godowns g ON s.godown_id = g.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (start_date) { sql += ` AND s.date >= $${idx++}`; params.push(start_date); }
    if (end_date) { sql += ` AND s.date <= $${idx++}`; params.push(end_date); }
    if (party_id) { sql += ` AND s.party_id = $${idx++}`; params.push(party_id); }
    if (brand_id) { sql += ` AND s.brand_id = $${idx++}`; params.push(brand_id); }
    if (month) { sql += ` AND to_char(s.date::date, 'YYYY-MM') = $${idx++}`; params.push(month); }

    sql += ' ORDER BY s.date DESC, s.id DESC';
    const rows = await getAll(sql, params);

    let sumSql = 'SELECT COALESCE(SUM(bags),0) as total_bags, COALESCE(SUM(sale_amount),0) as total_amount FROM sales WHERE 1=1';
    const sp: any[] = [];
    let si = 1;
    if (start_date) { sumSql += ` AND date >= $${si++}`; sp.push(start_date); }
    if (end_date) { sumSql += ` AND date <= $${si++}`; sp.push(end_date); }
    const summary = await getOne(sumSql, sp);

    res.json({ data: rows, summary });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/stock/:brandId', async (req, res) => {
  try {
    const godownId = req.query.godown_id ? Number(req.query.godown_id) : undefined;
    const stock = await getStock(Number(req.params.brandId), godownId);
    res.json({ stock });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { date, party_id, brand_id, cement_type, bags, sale_rate, destination, invoice_number, billed_party, billed_quantity, billed_rate, billed_amount, truck_number, godown_id, remarks } = req.body;
  try {
    const stock = await getStock(brand_id, godown_id || undefined);
    if (stock <= 0) {
      const brand = await getOne('SELECT name FROM cement_brands WHERE id=$1', [brand_id]);
      return res.status(400).json({ error: `No stock available for ${brand?.name || 'this brand'}. Please record a purchase first.` });
    }
    if (bags > stock) {
      return res.status(400).json({ error: `Only ${stock} bags available in stock. Cannot sell ${bags} bags.` });
    }

    const result = await getOne(
      `INSERT INTO sales (date, party_id, brand_id, cement_type, bags, sale_rate, destination, invoice_number, billed_party, billed_quantity, billed_rate, billed_amount, truck_number, godown_id, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [date, party_id, brand_id, cement_type, bags, sale_rate, destination, invoice_number, billed_party, billed_quantity || null, billed_rate || null, billed_amount || null, truck_number, godown_id || null, remarks]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { date, party_id, brand_id, cement_type, bags, sale_rate, destination, invoice_number, billed_party, billed_quantity, billed_rate, billed_amount, truck_number, godown_id, remarks } = req.body;
  try {
    const existing = await getOne('SELECT bags, brand_id, godown_id FROM sales WHERE id=$1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Sale not found' });

    const stock = await getStock(brand_id, godown_id || undefined) + (existing.brand_id === brand_id ? existing.bags : 0);
    if (bags > stock) {
      return res.status(400).json({ error: `Only ${stock} bags available. Cannot update to ${bags} bags.` });
    }

    const result = await getOne(
      `UPDATE sales SET date=$1, party_id=$2, brand_id=$3, cement_type=$4, bags=$5, sale_rate=$6, destination=$7, invoice_number=$8, billed_party=$9, billed_quantity=$10, billed_rate=$11, billed_amount=$12, truck_number=$13, godown_id=$14, remarks=$15
       WHERE id=$16 RETURNING *`,
      [date, party_id, brand_id, cement_type, bags, sale_rate, destination, invoice_number, billed_party, billed_quantity || null, billed_rate || null, billed_amount || null, truck_number, godown_id || null, remarks, req.params.id]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', requirePermission('delete_sales'), async (req, res) => {
  try {
    await query('DELETE FROM sales WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
