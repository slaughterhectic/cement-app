import express from 'express';
import cors from 'cors';
import { initializeDatabase, getOne, getAll } from './db/database';
import purchasesRouter from './routes/purchases';
import salesRouter from './routes/sales';
import stockRouter from './routes/stock';
import partiesRouter from './routes/parties';
import paymentsRouter from './routes/payments';
import expensesRouter from './routes/expenses';
import reportsRouter from './routes/reports';
import importRouter from './routes/import';
import brandsRouter from './routes/brands';
import capitalRouter from './routes/capital';
import imprestRouter from './routes/imprest';
import loansRouter from './routes/loans';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/purchases', purchasesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/stock', stockRouter);
app.use('/api/parties', partiesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/import', importRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/capital', capitalRouter);
app.use('/api/imprest', imprestRouter);
app.use('/api/loans', loansRouter);

app.get('/api/godowns', async (_req, res) => {
  try {
    const rows = await getAll('SELECT * FROM godowns');
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard/stats', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const todaySales = await getOne(
      `SELECT COALESCE(SUM(bags), 0) as bags, COALESCE(SUM(sale_amount), 0) as amount FROM sales WHERE date = $1`,
      [today]
    );

    const monthPurchases = await getOne(
      `SELECT COALESCE(SUM(purchase_amount), 0) as amount FROM purchases WHERE date >= $1`, [monthStart]
    );
    const monthSales = await getOne(
      `SELECT COALESCE(SUM(sale_amount), 0) as amount FROM sales WHERE date >= $1`, [monthStart]
    );

    const outstandingCalc = await getOne(`
      SELECT (COALESCE((SELECT SUM(sale_amount) FROM sales), 0)
             + COALESCE((SELECT SUM(opening_balance) FROM parties), 0)
             - COALESCE((SELECT SUM(amount) FROM payments), 0)) as total
    `);

    const stockCalc = await getOne(`
      SELECT COALESCE(SUM(sub.stock * sub.avg_rate), 0) as value, COALESCE(SUM(sub.stock), 0) as bags FROM (
        SELECT cb.id,
          (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id), 0)
           - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id), 0)) as stock,
          COALESCE((SELECT AVG(purchase_rate) FROM purchases WHERE brand_id = cb.id), 0) as avg_rate
        FROM cement_brands cb
      ) sub WHERE sub.stock > 0
    `);

    // Capital: cash (imprest) + bank balances
    const cashCalc = await getOne(`
      SELECT COALESCE(SUM(ih.opening_balance),0)
        + COALESCE((SELECT SUM(credit) FROM imprest_transactions),0)
        - COALESCE((SELECT SUM(debit) FROM imprest_transactions),0) as total
      FROM imprest_handlers ih
    `);
    // Bank balance: sum over each configured bank (opening + received - paid for that bank)
    const bankCalc = await getOne(`
      SELECT COALESCE(SUM(
        COALESCE(bb.opening_balance,0)
        + COALESCE((SELECT SUM(amount) FROM payments WHERE mode='bank' AND LOWER(bank_name)=LOWER(bb.bank_name)),0)
        - COALESCE((SELECT SUM(amount) FROM expenses WHERE mode='bank' AND LOWER(bank_name)=LOWER(bb.bank_name)),0)
      ),0) as total
      FROM bank_balances bb
    `);

    res.json({
      todaySales: { bags: Number(todaySales.bags), amount: Number(todaySales.amount) },
      monthProfit: Number(monthSales.amount) - Number(monthPurchases.amount),
      outstanding: Math.max(0, Number(outstandingCalc.total)),
      stockValue: { bags: Number(stockCalc.bags), value: Number(stockCalc.value) },
      totalCapital: Math.max(0, Number(cashCalc?.total ?? 0) + Number(bankCalc?.total ?? 0)),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard/charts', async (_req, res) => {
  try {
    const monthlySales = await getAll(`
      SELECT to_char(date::date, 'YYYY-MM') as month, cement_type, SUM(bags) as bags, SUM(sale_amount) as amount
      FROM sales WHERE date::date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY month, cement_type ORDER BY month
    `);

    const topBrands = await getAll(`
      SELECT cb.name, SUM(s.bags) as bags
      FROM sales s JOIN cement_brands cb ON s.brand_id = cb.id
      WHERE to_char(s.date::date, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM')
      GROUP BY cb.name ORDER BY bags DESC LIMIT 5
    `);

    const dailyRevenue = await getAll(`
      SELECT date, SUM(sale_amount) as revenue FROM sales
      WHERE to_char(date::date, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM')
      GROUP BY date ORDER BY date
    `);

    const dailyCost = await getAll(`
      SELECT date, SUM(purchase_amount) as cost FROM purchases
      WHERE to_char(date::date, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM')
      GROUP BY date ORDER BY date
    `);

    const topOutstanding = await getAll(`
      SELECT p.id, p.name,
        (COALESCE(p.opening_balance, 0)
         + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id), 0)) as outstanding
      FROM parties p
      WHERE (COALESCE(p.opening_balance, 0)
         + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id), 0)) > 0
      ORDER BY outstanding DESC LIMIT 10
    `);

    const recentSales = await getAll(`
      SELECT s.*, p.name as party_name, cb.name as brand_name
      FROM sales s JOIN parties p ON s.party_id = p.id JOIN cement_brands cb ON s.brand_id = cb.id
      ORDER BY s.date DESC, s.id DESC LIMIT 10
    `);

    const lowStock = await getAll(`
      SELECT cb.id, cb.name, cb.type,
        (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id), 0)
         - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id), 0)) as stock,
        (SELECT date FROM purchases WHERE brand_id = cb.id ORDER BY date DESC LIMIT 1) as last_purchase
      FROM cement_brands cb WHERE cb.is_active = 1
      AND (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id), 0)
           - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id), 0)) < 200
      AND (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id), 0)
           - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id), 0)) >= 0
      ORDER BY stock ASC
    `);

    res.json({ monthlySales, topBrands, dailyRevenue, dailyCost, topOutstanding, recentSales, lowStock });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`CementBook API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
