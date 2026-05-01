import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { friendlyError } from '../lib/userError';

const router = Router();

// GET /trucks/dashboard — summary stats
router.get('/dashboard', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const totalTrucks = await getOne('SELECT COUNT(*) as count FROM trucks WHERE is_active = 1');
    const totalTrips = await getOne('SELECT COUNT(*) as count FROM truck_trips');
    const monthFreight = await getOne(
      `SELECT COALESCE(SUM(net_freight), 0) as total FROM truck_trips WHERE date >= $1`,
      [monthStart]
    );
    const monthProfit = await getOne(
      `SELECT COALESCE(SUM(net_profit), 0) as total FROM truck_trips WHERE date >= $1`,
      [monthStart]
    );

    const perTruck = await getAll(`
      SELECT
        t.id,
        t.truck_number,
        COUNT(tt.id) as trip_count,
        COALESCE(SUM(tt.total_freight), 0) as total_freight,
        COALESCE(SUM(tt.net_freight), 0) as net_freight,
        COALESCE(SUM(tt.diesel_amount + tt.driver_payment + tt.miscellaneous + tt.toll_expense), 0) as total_variable_cost,
        COALESCE((SELECT SUM(te.amount) FROM truck_expenses te WHERE te.truck_id = t.id), 0) as total_fixed_expense,
        COALESCE(SUM(tt.net_profit), 0) as net_profit
      FROM trucks t
      LEFT JOIN truck_trips tt ON tt.truck_id = t.id
      GROUP BY t.id, t.truck_number
      ORDER BY t.truck_number
    `);

    res.json({
      totalTrucks: Number(totalTrucks.count),
      totalTrips: Number(totalTrips.count),
      monthFreight: Number(monthFreight.total),
      monthProfit: Number(monthProfit.total),
      perTruck,
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// GET /trucks — list with stats
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT
        t.*,
        COUNT(tt.id) as trip_count,
        COALESCE(SUM(tt.total_freight), 0) as total_freight,
        COALESCE(SUM(tt.diesel_amount + tt.driver_payment + tt.miscellaneous + tt.toll_expense), 0) as total_variable_cost,
        COALESCE((SELECT SUM(te.amount) FROM truck_expenses te WHERE te.truck_id = t.id), 0) as total_fixed_expense
      FROM trucks t
      LEFT JOIN truck_trips tt ON tt.truck_id = t.id
      GROUP BY t.id
      ORDER BY t.truck_number
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /trucks
router.post('/', async (req, res) => {
  try {
    const {
      truck_number, purchase_date, total_value, down_payment,
      financed_amount, emi_amount, emi_tenure, lender_name, remarks,
    } = req.body;
    if (!truck_number) return res.status(400).json({ error: 'truck_number is required' });
    const row = await getOne(
      `INSERT INTO trucks (truck_number, purchase_date, total_value, down_payment, financed_amount, emi_amount, emi_tenure, lender_name, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [truck_number.trim(), purchase_date || null, total_value || 0, down_payment || 0,
       financed_amount || 0, emi_amount || 0, emi_tenure || null, lender_name || null, remarks || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /trucks/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      truck_number, purchase_date, total_value, down_payment,
      financed_amount, emi_amount, emi_tenure, lender_name, is_active, remarks,
    } = req.body;
    const row = await getOne(
      `UPDATE trucks SET
        truck_number=$1, purchase_date=$2, total_value=$3, down_payment=$4,
        financed_amount=$5, emi_amount=$6, emi_tenure=$7, lender_name=$8,
        is_active=$9, remarks=$10
       WHERE id=$11 RETURNING *`,
      [truck_number, purchase_date || null, total_value || 0, down_payment || 0,
       financed_amount || 0, emi_amount || 0, emi_tenure || null, lender_name || null,
       is_active ?? 1, remarks || null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Truck not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /trucks/:id
router.delete('/:id', async (req, res) => {
  try {
    const used = await getOne('SELECT 1 FROM truck_trips WHERE truck_id=$1 LIMIT 1', [req.params.id]);
    if (used) return res.status(400).json({ error: 'Cannot delete truck with existing trips' });
    await query('DELETE FROM trucks WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
