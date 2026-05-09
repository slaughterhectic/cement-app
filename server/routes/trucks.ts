import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { friendlyError } from '../lib/userError';

const router = Router();

// GET /trucks/dashboard — summary stats. Accepts optional ?month=YYYY-MM.
router.get('/dashboard', async (req, res) => {
  try {
    const { month } = req.query as { month?: string };

    const mp = month ? [month] : [];  // params for month-filtered queries

    const totalTrucks = await getOne('SELECT COUNT(*) as count FROM trucks WHERE is_active = 1');
    const totalTrips = month
      ? await getOne(`SELECT COUNT(*) as count FROM truck_trips WHERE to_char(date::date, 'YYYY-MM') = $1`, mp)
      : await getOne('SELECT COUNT(*) as count FROM truck_trips');

    // Gross freight earned
    const monthFreight = await getOne(
      month
        ? `SELECT COALESCE(SUM(total_freight), 0) as total FROM truck_trips WHERE to_char(date::date, 'YYYY-MM') = $1`
        : `SELECT COALESCE(SUM(total_freight), 0) as total FROM truck_trips`,
      mp
    );

    // Trip-level net profit (all per-trip deductions already included)
    const tripNetProfit = await getOne(
      month
        ? `SELECT COALESCE(SUM(net_profit), 0) as total FROM truck_trips WHERE to_char(date::date, 'YYYY-MM') = $1`
        : `SELECT COALESCE(SUM(net_profit), 0) as total FROM truck_trips`,
      mp
    );

    // Fixed expenses (truck_expenses) filtered by period
    const fixedExpRow = await getOne(
      month
        ? `SELECT COALESCE(SUM(amount), 0) as total FROM truck_expenses WHERE to_char(date::date, 'YYYY-MM') = $1`
        : `SELECT COALESCE(SUM(amount), 0) as total FROM truck_expenses`,
      mp
    );

    // Fixed expense breakdown by category for the popup
    const fixedBreakdown = await getAll(
      month
        ? `SELECT COALESCE(category, 'General') as category, COALESCE(SUM(amount), 0) as total
           FROM truck_expenses WHERE to_char(date::date, 'YYYY-MM') = $1
           GROUP BY category ORDER BY total DESC`
        : `SELECT COALESCE(category, 'General') as category, COALESCE(SUM(amount), 0) as total
           FROM truck_expenses GROUP BY category ORDER BY total DESC`,
      mp
    );

    // Urea charge for the period
    const ureaRow = await getOne(
      month
        ? `SELECT COALESCE(SUM(amount), 0) as total FROM truck_urea_charges WHERE month = $1`
        : `SELECT COALESCE(SUM(amount), 0) as total FROM truck_urea_charges`,
      mp
    );

    const totalFixedExpense = Number(fixedExpRow.total);
    const totalUrea = Number(ureaRow?.total ?? 0);
    const monthProfit = Number(tripNetProfit.total) - totalFixedExpense - totalUrea;

    // Per-truck: trip expense = all wallet/fastag/ledger costs; net_profit = sum of trip-level profits
    const perTruckParams: any[] = month ? [month] : [];
    const tripMonthFilter = month ? `AND to_char(tt.date::date, 'YYYY-MM') = $1` : '';

    const perTruck = await getAll(`
      SELECT
        t.id,
        t.truck_number,
        COUNT(tt.id) as trip_count,
        COALESCE(SUM(tt.total_freight), 0) as total_freight,
        COALESCE(SUM(tt.net_freight), 0) as net_freight,
        COALESCE(SUM(
          COALESCE(tt.loading_charge,0) + COALESCE(tt.unloading_charge,0) +
          COALESCE(tt.advance_deduction,0) + COALESCE(tt.diesel_amount,0) +
          COALESCE(tt.driver_payment,0) + COALESCE(tt.miscellaneous,0) +
          COALESCE(tt.toll_expense,0)
        ), 0) as total_trip_expense,
        COALESCE(SUM(tt.net_profit), 0) as net_profit
      FROM trucks t
      LEFT JOIN truck_trips tt ON tt.truck_id = t.id ${tripMonthFilter}
      GROUP BY t.id, t.truck_number
      ORDER BY t.truck_number
    `, perTruckParams);

    res.json({
      totalTrucks: Number(totalTrucks.count),
      totalTrips: Number(totalTrips.count),
      monthFreight: Number(monthFreight.total),
      monthProfit,
      totalFixedExpense,
      totalUrea,
      fixedBreakdown,
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
