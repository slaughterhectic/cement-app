import { Router } from 'express';
import { getOne, getAll } from '../db/database';

const router = Router();

router.get('/pnl', async (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);

    const purchases = await getOne(
      `SELECT COALESCE(SUM(purchase_amount),0) as total FROM purchases WHERE to_char(date::date,'YYYY-MM')=$1`, [month]
    );
    const sales = await getOne(
      `SELECT COALESCE(SUM(sale_amount),0) as total FROM sales WHERE to_char(date::date,'YYYY-MM')=$1`, [month]
    );
    const expenses = await getOne(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE to_char(date::date,'YYYY-MM')=$1`, [month]
    );

    const grossProfit = Number(sales.total) - Number(purchases.total);
    const netProfit = grossProfit - Number(expenses.total);

    const monthlyTrend = await getAll(`
      SELECT m.month,
        COALESCE((SELECT SUM(sale_amount) FROM sales WHERE to_char(date::date,'YYYY-MM')=m.month),0) as sales,
        COALESCE((SELECT SUM(purchase_amount) FROM purchases WHERE to_char(date::date,'YYYY-MM')=m.month),0) as purchases,
        COALESCE((SELECT SUM(amount) FROM expenses WHERE to_char(date::date,'YYYY-MM')=m.month),0) as expenses
      FROM (
        SELECT DISTINCT to_char(date::date,'YYYY-MM') as month FROM sales
        UNION SELECT DISTINCT to_char(date::date,'YYYY-MM') FROM purchases
        ORDER BY month DESC LIMIT 6
      ) m ORDER BY m.month
    `);

    res.json({
      month,
      totalPurchases: Number(purchases.total),
      totalSales: Number(sales.total),
      grossProfit,
      totalExpenses: Number(expenses.total),
      netProfit,
      profitMargin: Number(sales.total) > 0 ? (netProfit / Number(sales.total)) * 100 : 0,
      monthlyTrend,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/brands', async (_req, res) => {
  try {
    const brands = await getAll(`
      SELECT cb.id, cb.name, cb.type,
        COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id=cb.id),0) as bags_purchased,
        COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id=cb.id),0) as bags_sold,
        COALESCE((SELECT CASE WHEN SUM(bags)>0 THEN SUM((purchase_rate+COALESCE(freight_rate,0))*bags)/SUM(bags) ELSE 0 END FROM purchases WHERE brand_id=cb.id),0) as avg_purchase_rate,
        COALESCE((SELECT CASE WHEN SUM(bags)>0 THEN SUM(sale_rate*bags)/SUM(bags) ELSE 0 END FROM sales WHERE brand_id=cb.id),0) as avg_sale_rate,
        COALESCE((SELECT CASE WHEN SUM(bags)>0 THEN SUM(sale_rate*bags)/SUM(bags) ELSE 0 END FROM sales WHERE brand_id=cb.id),0)
          - COALESCE((SELECT CASE WHEN SUM(bags)>0 THEN SUM((purchase_rate+COALESCE(freight_rate,0))*bags)/SUM(bags) ELSE 0 END FROM purchases WHERE brand_id=cb.id),0) as avg_margin,
        COALESCE((SELECT SUM(sale_amount) FROM sales WHERE brand_id=cb.id),0)
          - COALESCE((SELECT SUM(purchase_amount) FROM purchases WHERE brand_id=cb.id),0)
          - COALESCE((SELECT SUM(COALESCE(freight_rate,0) * bags) FROM purchases WHERE brand_id=cb.id),0) as total_profit
      FROM cement_brands cb WHERE cb.is_active=1 ORDER BY total_profit DESC
    `);
    res.json(brands);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/outstanding', async (_req, res) => {
  try {
    const parties = await getAll(`
      SELECT p.id, p.name, p.location, p.district, p.phone,
        (COALESCE(p.opening_balance,0)
         + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=p.id),0)
         + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id AND direction='pay'),0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id AND (direction='receive' OR direction IS NULL)),0)) as outstanding,
        (SELECT MAX(date) FROM sales WHERE party_id=p.id) as last_sale,
        (SELECT MAX(date) FROM payments WHERE party_id=p.id) as last_payment
      FROM parties p
      WHERE p.type != 'supplier'
        AND (COALESCE(p.opening_balance,0)
         + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=p.id),0)
         + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id AND direction='pay'),0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id AND (direction='receive' OR direction IS NULL)),0)) > 0
      ORDER BY outstanding DESC
    `);
    res.json(parties);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/daily-register', async (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const register = await getAll(`
      SELECT s.id, s.date, cb.name as cement_name, s.cement_type, s.truck_number,
        (SELECT pu.supplier_name FROM purchases pu WHERE pu.brand_id=s.brand_id ORDER BY pu.date DESC LIMIT 1) as purchase_from,
        (SELECT pu.purchase_rate FROM purchases pu WHERE pu.brand_id=s.brand_id ORDER BY pu.date DESC LIMIT 1) as purchase_rate,
        s.bags as quantity,
        s.bags * COALESCE((SELECT pu.purchase_rate FROM purchases pu WHERE pu.brand_id=s.brand_id ORDER BY pu.date DESC LIMIT 1),0) as purchase_amount,
        p.name as sale_to, s.sale_rate, s.destination, s.sale_amount,
        COALESCE(s.billed_party, p.name) as party_receiving
      FROM sales s
      JOIN parties p ON s.party_id=p.id
      JOIN cement_brands cb ON s.brand_id=cb.id
      WHERE to_char(s.date::date,'YYYY-MM')=$1
      ORDER BY s.date, s.id
    `, [month]);
    res.json(register);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/daily-pnl', async (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const rows = await getAll(`
      SELECT d.date,
        COALESCE(s.sales, 0) as sales,
        COALESCE(p.purchases, 0) as purchases,
        COALESCE(e.expenses, 0) as expenses,
        COALESCE(s.sales, 0) - COALESCE(p.purchases, 0) as gross_profit,
        COALESCE(s.sales, 0) - COALESCE(p.purchases, 0) - COALESCE(e.expenses, 0) as net_profit,
        COALESCE(s.bags, 0) as bags_sold
      FROM (
        SELECT DISTINCT date FROM sales WHERE to_char(date::date,'YYYY-MM')=$1
        UNION SELECT DISTINCT date FROM purchases WHERE to_char(date::date,'YYYY-MM')=$1
        UNION SELECT DISTINCT date FROM expenses WHERE to_char(date::date,'YYYY-MM')=$1
      ) d
      LEFT JOIN (SELECT date, SUM(sale_amount) as sales, SUM(bags) as bags FROM sales WHERE to_char(date::date,'YYYY-MM')=$1 GROUP BY date) s ON d.date=s.date
      LEFT JOIN (SELECT date, SUM(purchase_amount) as purchases FROM purchases WHERE to_char(date::date,'YYYY-MM')=$1 GROUP BY date) p ON d.date=p.date
      LEFT JOIN (SELECT date, SUM(amount) as expenses FROM expenses WHERE to_char(date::date,'YYYY-MM')=$1 GROUP BY date) e ON d.date=e.date
      ORDER BY d.date
    `, [month]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/daily-collection', async (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const view = (req.query.view as string) || 'daily'; // 'daily' | 'monthly'

    if (view === 'monthly') {
      // Monthly aggregation — last 12 months, only received payments
      const monthly = await getAll(`
        SELECT to_char(date::date,'YYYY-MM') as month,
          COALESCE(SUM(amount),0) as total,
          COALESCE(SUM(CASE WHEN mode='bank' THEN amount ELSE 0 END),0) as bank,
          COALESCE(SUM(CASE WHEN mode='cash' THEN amount ELSE 0 END),0) as cash,
          COUNT(*) as count
        FROM payments
        WHERE direction='receive'
          AND date::date >= (CURRENT_DATE - INTERVAL '12 months')
        GROUP BY to_char(date::date,'YYYY-MM')
        ORDER BY month
      `);
      return res.json({ rows: [], daily: monthly, view: 'monthly' });
    }

    // Daily view — only received payments for the selected month
    const rows = await getAll(`
      SELECT py.id, py.date, pt.name as party_name, py.amount, py.mode, py.bank_name, py.remarks
      FROM payments py
      JOIN parties pt ON py.party_id = pt.id
      WHERE to_char(py.date::date,'YYYY-MM')=$1
        AND py.direction='receive'
      ORDER BY py.date, py.id
    `, [month]);

    const daily = await getAll(`
      SELECT date,
        COALESCE(SUM(amount),0) as total,
        COALESCE(SUM(CASE WHEN mode='bank' THEN amount ELSE 0 END),0) as bank,
        COALESCE(SUM(CASE WHEN mode='cash' THEN amount ELSE 0 END),0) as cash,
        COUNT(*) as count
      FROM payments
      WHERE to_char(date::date,'YYYY-MM')=$1
        AND direction='receive'
      GROUP BY date ORDER BY date
    `, [month]);

    res.json({ rows, daily, view: 'daily' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
