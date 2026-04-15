import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { requirePermission } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, brand_id, supplier } = req.query;
    let sql = `
      SELECT p.*,
        COALESCE(pt.name, p.supplier_name) as supplier_name,
        cb.name as brand_name, g.name as godown_name
      FROM purchases p
      LEFT JOIN cement_brands cb ON p.brand_id = cb.id
      LEFT JOIN godowns g ON p.godown_id = g.id
      LEFT JOIN parties pt ON p.supplier_id = pt.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (start_date) { sql += ` AND p.date >= $${idx++}`; params.push(start_date); }
    if (end_date) { sql += ` AND p.date <= $${idx++}`; params.push(end_date); }
    if (brand_id) { sql += ` AND p.brand_id = $${idx++}`; params.push(brand_id); }
    if (supplier) { sql += ` AND COALESCE(pt.name, p.supplier_name) ILIKE $${idx++}`; params.push(`%${supplier}%`); }

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
  const { date, supplier_id, brand_id, cement_type, bags, purchase_rate, freight_rate, godown_id, truck_number, source_location, invoice_number, remarks } = req.body;
  try {
    // Non-admin users entering a past/future date need admin approval
    const today = new Date().toISOString().split('T')[0];
    if (req.user?.role !== 'admin' && date !== today) {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name)
         VALUES ('purchase', $1::jsonb, $2, $3) RETURNING id`,
        [JSON.stringify(req.body), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    // Resolve supplier_name from party for backward compat
    const party = supplier_id ? await getOne('SELECT name FROM parties WHERE id=$1', [supplier_id]) : null;
    const supplier_name = party?.name ?? '';
    const result = await getOne(
      `INSERT INTO purchases (date, supplier_name, supplier_id, brand_id, cement_type, bags, purchase_rate, freight_rate, godown_id, truck_number, source_location, invoice_number, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [date, supplier_name, supplier_id || null, brand_id, cement_type, bags, purchase_rate, freight_rate || 0, godown_id || null, truck_number, source_location, invoice_number || null, remarks]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { date, supplier_id, brand_id, cement_type, bags, purchase_rate, freight_rate, godown_id, truck_number, source_location, invoice_number, remarks } = req.body;
  try {
    const party = supplier_id ? await getOne('SELECT name FROM parties WHERE id=$1', [supplier_id]) : null;
    const supplier_name = party?.name ?? '';
    const result = await getOne(
      `UPDATE purchases SET date=$1, supplier_name=$2, supplier_id=$3, brand_id=$4, cement_type=$5, bags=$6, purchase_rate=$7, freight_rate=$8, godown_id=$9, truck_number=$10, source_location=$11, invoice_number=$12, remarks=$13
       WHERE id=$14 RETURNING *`,
      [date, supplier_name, supplier_id || null, brand_id, cement_type, bags, purchase_rate, freight_rate || 0, godown_id || null, truck_number, source_location, invoice_number || null, remarks, req.params.id]
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

// GET /api/purchases/rates/:brandId — distinct landed rates with available stock per rate (FIFO)
// Sales with cost_rate>0 are attributed directly; cost_rate=0 (legacy) are applied FIFO (oldest lot first)
router.get('/rates/:brandId', async (req, res) => {
  try {
    const rates = await getAll(`
      WITH purchase_rates AS (
        SELECT
          purchase_rate + COALESCE(freight_rate, 0) AS landed_rate,
          purchase_rate,
          COALESCE(freight_rate, 0) AS freight_rate,
          SUM(bags) AS purchased_bags,
          MAX(date) AS last_date,
          MIN(date) AS first_date
        FROM purchases
        WHERE brand_id = $1
        GROUP BY purchase_rate, freight_rate
      ),
      direct_sold AS (
        SELECT cost_rate, SUM(bags) AS bags_sold
        FROM sales
        WHERE brand_id = $1 AND COALESCE(cost_rate, 0) > 0
        GROUP BY cost_rate
      ),
      after_direct AS (
        SELECT pr.*,
          GREATEST(0, pr.purchased_bags - COALESCE(ds.bags_sold, 0)) AS remaining_after_direct
        FROM purchase_rates pr
        LEFT JOIN direct_sold ds ON ds.cost_rate = pr.landed_rate
      ),
      unattributed AS (
        SELECT COALESCE(SUM(bags), 0) AS total_unattr
        FROM sales
        WHERE brand_id = $1 AND COALESCE(cost_rate, 0) = 0
      ),
      fifo AS (
        SELECT ad.*,
          COALESCE(SUM(ad.remaining_after_direct) OVER (
            ORDER BY ad.first_date, ad.landed_rate
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ), 0) AS cum_start
        FROM after_direct ad
      )
      SELECT
        f.landed_rate,
        f.purchase_rate,
        f.freight_rate,
        f.purchased_bags,
        GREATEST(0,
          f.remaining_after_direct - GREATEST(0,
            LEAST(u.total_unattr - f.cum_start, f.remaining_after_direct)
          )
        ) AS available_bags,
        f.last_date
      FROM fifo f, unattributed u
      WHERE GREATEST(0,
        f.remaining_after_direct - GREATEST(0,
          LEAST(u.total_unattr - f.cum_start, f.remaining_after_direct)
        )
      ) > 0
      ORDER BY f.landed_rate DESC
    `, [req.params.brandId]);

    const totalStock = rates.reduce((sum: number, r: any) => sum + Number(r.available_bags), 0);
    res.json({ rates, totalStock });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
