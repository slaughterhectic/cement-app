import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase, getOne, getAll, query } from './db/database';
import { authMiddleware } from './middleware/auth';
import authRouter from './routes/auth';
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
import dealersRouter from './routes/dealers';
import expenseCategoriesRouter from './routes/expenseCategories';
import partyLoansRouter from './routes/partyLoans';
import trucksRouter from './routes/trucks';
import driversRouter from './routes/drivers';
import truckTripsRouter from './routes/truckTrips';
import driverPaymentsRouter from './routes/driverPayments';
import truckExpensesRouter from './routes/truckExpenses';
import requestsRouter from './routes/requests';
import transportersRouter from './routes/transporters';
import pendingEntriesRouter from './routes/pendingEntries';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Health check — no auth, used by keep-alive ping
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Auth routes (login is unprotected inside the router)
app.use('/api/auth', authRouter);

// Protect all other /api routes
app.use('/api', authMiddleware);

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
app.use('/api/dealers', dealersRouter);
app.use('/api/expense-categories', expenseCategoriesRouter);
app.use('/api/party-loans', partyLoansRouter);
app.use('/api/trucks', trucksRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/truck-trips', truckTripsRouter);
app.use('/api/driver-payments', driverPaymentsRouter);
app.use('/api/truck-expenses', truckExpensesRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/transporters', transportersRouter);
app.use('/api/pending-entries', pendingEntriesRouter);

// Godown CRUD
app.get('/api/godowns', async (_req, res) => {
  try { res.json(await getAll('SELECT * FROM godowns ORDER BY name')); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/godowns', async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const row = await getOne(
      'INSERT INTO godowns (name, location) VALUES ($1, $2) RETURNING *',
      [name.trim(), location?.trim() || null]
    );
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/godowns/:id', async (req, res) => {
  try {
    const { name, location } = req.body;
    const row = await getOne(
      'UPDATE godowns SET name=$1, location=$2 WHERE id=$3 RETURNING *',
      [name.trim(), location?.trim() || null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Godown not found' });
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/godowns/:id', async (req, res) => {
  try {
    const used = await getOne(
      'SELECT 1 FROM purchases WHERE godown_id=$1 UNION SELECT 1 FROM sales WHERE godown_id=$1 LIMIT 1',
      [req.params.id]
    );
    if (used) return res.status(400).json({ error: 'Godown is used in purchases/sales and cannot be deleted' });
    await query('DELETE FROM godowns WHERE id=$1', [req.params.id]);
    res.json({ success: true });
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
    // All-time totals for net profit
    const totalSales = await getOne(`SELECT COALESCE(SUM(sale_amount), 0) as amount FROM sales`);
    const totalPurchases = await getOne(`SELECT COALESCE(SUM(purchase_amount), 0) as amount FROM purchases`);
    const totalExpenses = await getOne(`SELECT COALESCE(SUM(amount), 0) as amount FROM expenses`);

    // Outstanding receivable = sum of POSITIVE customer balances (they owe us)
    const outstandingCalc = await getOne(`
      SELECT COALESCE(SUM(GREATEST(0,
        COALESCE(p.opening_balance,0)
        + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=p.id),0)
        + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id AND direction='pay'),0)
        - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id AND (direction='receive' OR direction IS NULL)),0)
      )),0) as total FROM parties p WHERE p.type != 'supplier'
    `);
    // Outstanding payable = sum of POSITIVE supplier balances (we owe them)
    const payableCalc = await getOne(`
      SELECT COALESCE(SUM(GREATEST(0,
        COALESCE(p.opening_balance,0)
        + COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id=p.id),0)
        - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id=p.id),0)
      )),0) as total FROM parties p WHERE p.type = 'supplier'
    `);

    const stockCalc = await getOne(`
      SELECT COALESCE(SUM(sub.stock * sub.avg_rate), 0) as value, COALESCE(SUM(sub.stock), 0) as bags FROM (
        SELECT cb.id,
          (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id = cb.id), 0)
           - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id = cb.id), 0)) as stock,
          COALESCE((SELECT CASE WHEN SUM(bags)>0 THEN SUM((purchase_rate+COALESCE(freight_rate,0))*bags)/SUM(bags) ELSE 0 END FROM purchases WHERE brand_id = cb.id), 0) as avg_rate
        FROM cement_brands cb
      ) sub WHERE sub.stock > 0
    `);

    // Bank = opening + received (direction=receive) - paid_out (direction=pay) - expenses
    const bankCalc = await getOne(`
      SELECT
        (SELECT COALESCE(SUM(opening_balance),0) FROM bank_balances)
        + (SELECT COALESCE(SUM(amount),0) FROM payments WHERE mode='bank' AND (direction='receive' OR direction IS NULL))
        - (SELECT COALESCE(SUM(amount),0) FROM payments WHERE mode='bank' AND direction='pay')
        - (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE mode='bank') as total
    `);
    // Cash = opening + received (direction=receive) - paid_out (direction=pay) - expenses + imprest
    const cashCalc = await getOne(`
      SELECT
        (SELECT COALESCE(SUM(opening_balance),0) FROM imprest_handlers)
        + (SELECT COALESCE(SUM(amount),0) FROM payments WHERE mode='cash' AND (direction='receive' OR direction IS NULL))
        - (SELECT COALESCE(SUM(amount),0) FROM payments WHERE mode='cash' AND direction='pay')
        - (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE mode='cash')
        + (SELECT COALESCE(SUM(credit),0) FROM imprest_transactions)
        - (SELECT COALESCE(SUM(debit),0) FROM imprest_transactions) as total
    `);
    // Bank/cash breakdown for dashboard — received = direction=receive, paid = direction=pay + expenses
    const bankReceived = await getOne(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE mode='bank' AND (direction='receive' OR direction IS NULL)`);
    const cashReceived = await getOne(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE mode='cash' AND (direction='receive' OR direction IS NULL)`);
    const bankPaid = await getOne(`
      SELECT COALESCE((SELECT SUM(amount) FROM payments WHERE mode='bank' AND direction='pay'),0)
           + COALESCE((SELECT SUM(amount) FROM expenses WHERE mode='bank'),0) as total
    `);
    const cashPaid = await getOne(`
      SELECT COALESCE((SELECT SUM(amount) FROM payments WHERE mode='cash' AND direction='pay'),0)
           + COALESCE((SELECT SUM(amount) FROM expenses WHERE mode='cash'),0) as total
    `);

    res.json({
      todaySales: { bags: Number(todaySales.bags), amount: Number(todaySales.amount) },
      // Net Profit = Stock Value + Total Sales - Total Purchases - Total Expenses
      // (stock value represents unsold inventory still held as asset)
      monthProfit: Number(stockCalc.value) + Number(totalSales.amount) - Number(totalPurchases.amount) - Number(totalExpenses.amount),
      outstanding: Number(outstandingCalc.total),
      outstandingReceivable: Number(outstandingCalc.total),
      outstandingPayable: Number(payableCalc.total),
      stockValue: { bags: Number(stockCalc.bags), value: Number(stockCalc.value) },
      totalCapital: Number(bankCalc?.total ?? 0) + Number(cashCalc?.total ?? 0),
      bankBalance: Number(bankCalc?.total ?? 0),
      cashBalance: Number(cashCalc?.total ?? 0),
      bankReceived: Number(bankReceived?.total ?? 0),
      cashReceived: Number(cashReceived?.total ?? 0),
      bankPaid: Number(bankPaid?.total ?? 0),
      cashPaid: Number(cashPaid?.total ?? 0),
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
         + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND direction = 'pay'), 0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND (direction = 'receive' OR direction IS NULL)), 0)) as outstanding
      FROM parties p
      WHERE p.type != 'supplier'
        AND (COALESCE(p.opening_balance, 0)
         + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0)
         + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND direction = 'pay'), 0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND (direction = 'receive' OR direction IS NULL)), 0)) > 0
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

// Database backup endpoint — returns Excel workbook (admin only)
app.get('/api/backup', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const XLSX = await import('xlsx');

    const tables = [
      'parties', 'cement_brands', 'godowns', 'purchases', 'sales',
      'payments', 'expenses', 'loans', 'imprest_handlers',
      'imprest_transactions', 'bank_balances', 'users', 'user_permissions',
    ];

    const wb = XLSX.utils.book_new();
    for (const table of tables) {
      const rows = await getAll(`SELECT * FROM ${table}`);
      const ws = rows.length > 0
        ? XLSX.utils.json_to_sheet(rows)
        : XLSX.utils.aoa_to_sheet([['(empty)']]);
      XLSX.utils.book_append_sheet(wb, ws, table.replace('imprest_', 'imp_'));
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="cementbook-backup-${timestamp}.xlsx"`);
    res.send(buf);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Serve built frontend in production
const distPath = path.join(process.cwd(), 'client/dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
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
