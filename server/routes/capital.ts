import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';

const router = Router();

router.get('/summary', async (_req, res) => {
  try {
    // Cash: imprest handlers
    const handlers = await getAll(`
      SELECT ih.handler_name, ih.opening_balance,
        COALESCE((SELECT SUM(credit) FROM imprest_transactions WHERE handler_name=ih.handler_name),0) as total_received,
        COALESCE((SELECT SUM(debit) FROM imprest_transactions WHERE handler_name=ih.handler_name),0) as total_spent
      FROM imprest_handlers ih ORDER BY ih.handler_name
    `);
    const cash = handlers.map((h: any) => ({
      handler: h.handler_name,
      opening: Number(h.opening_balance),
      total_received: Number(h.total_received),
      total_spent: Number(h.total_spent),
      balance: Number(h.opening_balance) + Number(h.total_received) - Number(h.total_spent),
    }));
    const totalCash = cash.reduce((s: number, h: any) => s + h.balance, 0);

    // Banks: auto-compute from payments/expenses grouped by bank_name
    // Also include opening balances from bank_balances table for configured banks
    const bankPaymentsRows = await getAll(`
      SELECT COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified') as bank_name,
        COALESCE(SUM(amount),0) as received
      FROM payments WHERE mode='bank'
      GROUP BY COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified')
    `);
    const bankExpenseRows = await getAll(`
      SELECT COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified') as bank_name,
        COALESCE(SUM(amount),0) as paid
      FROM expenses WHERE mode='bank'
      GROUP BY COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified')
    `);
    const bankOpeningRows = await getAll(`SELECT bank_name, opening_balance FROM bank_balances`);

    // Merge all distinct bank names
    const allNames = new Set<string>([
      ...bankPaymentsRows.map((r: any) => r.bank_name),
      ...bankExpenseRows.map((r: any) => r.bank_name),
      ...bankOpeningRows.map((r: any) => r.bank_name),
    ]);

    const banks = Array.from(allNames).map((name: string) => {
      const received = Number(bankPaymentsRows.find((r: any) => r.bank_name === name)?.received ?? 0);
      const paid = Number(bankExpenseRows.find((r: any) => r.bank_name === name)?.paid ?? 0);
      const ob = Number(bankOpeningRows.find((r: any) =>
        r.bank_name?.toLowerCase() === name.toLowerCase()
      )?.opening_balance ?? 0);
      return { bank_name: name, opening: ob, total_received: received, total_paid: paid, balance: ob + received - paid };
    }).sort((a: any, b: any) => b.balance - a.balance);

    // Total bank = opening balances + all bank payments received - all bank expenses
    const totalBank =
      Number((await getOne(`SELECT COALESCE(SUM(opening_balance),0) as t FROM bank_balances`))?.t ?? 0) +
      Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE mode='bank'`))?.t ?? 0) -
      Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE mode='bank'`))?.t ?? 0);

    // Stock value
    const stockCalc = await getOne(`
      SELECT COALESCE(SUM(sub.stock * sub.avg_rate),0) as value, COALESCE(SUM(sub.stock),0) as bags FROM (
        SELECT cb.id,
          (COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id=cb.id),0)
           - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id=cb.id),0)) as stock,
          COALESCE((SELECT AVG(purchase_rate) FROM purchases WHERE brand_id=cb.id),0) as avg_rate
        FROM cement_brands cb
      ) sub WHERE sub.stock > 0
    `);

    // Outstanding (sum of positive individual party balances only)
    const outstandingCalc = await getOne(`
      SELECT COALESCE(SUM(GREATEST(0,
        COALESCE(p.opening_balance,0)
        + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=p.id),0)
        - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id),0)
      )),0) as total FROM parties p
    `);

    // Loans outstanding
    const loansCalc = await getOne(`
      SELECT COALESCE(SUM(COALESCE(outstanding_principal, principal)),0) as total FROM loans
    `);

    res.json({
      cash,
      totalCash,
      banks,
      totalBank,
      stockValue: { value: Number(stockCalc?.value ?? 0), bags: Number(stockCalc?.bags ?? 0) },
      totalOutstanding: Number(outstandingCalc?.total ?? 0),
      totalLoans: Number(loansCalc?.total ?? 0),
      totalCapital: totalCash + totalBank,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/banks', async (_req, res) => {
  try {
    const rows = await getAll(`SELECT * FROM bank_balances ORDER BY bank_name`);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/banks', async (req, res) => {
  const { bank_name, opening_balance } = req.body;
  try {
    const row = await getOne(
      `INSERT INTO bank_balances (bank_name, opening_balance)
       VALUES ($1,$2)
       ON CONFLICT (bank_name) DO UPDATE SET opening_balance=$2
       RETURNING *`,
      [bank_name, opening_balance ?? 0]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/banks/:name', async (req, res) => {
  try {
    await query('DELETE FROM bank_balances WHERE bank_name=$1', [req.params.name]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
