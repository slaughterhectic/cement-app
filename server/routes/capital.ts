import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { requirePermission } from '../middleware/auth';

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
    const imprestCash = cash.reduce((s: number, h: any) => s + h.balance, 0);

    // Cash received from customers (direction='receive') minus cash paid to suppliers (direction='pay') minus expenses
    const cashReceivedTotal = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE mode='cash' AND direction='receive'`))?.t ?? 0);
    const cashPaidOutTotal = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE mode='cash' AND direction='pay'`))?.t ?? 0);
    const cashExpensesTotal = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE mode='cash'`))?.t ?? 0);
    const cashLoanDisbursed = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM party_loans WHERE mode='cash' AND type='disbursement'`))?.t ?? 0);
    const cashLoanRepaid = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM party_loans WHERE mode='cash' AND type='repayment'`))?.t ?? 0);
    const totalCash = imprestCash + cashReceivedTotal - cashPaidOutTotal - cashExpensesTotal - cashLoanDisbursed + cashLoanRepaid;

    // Banks: received = payments with direction='receive'; paid = payments with direction='pay' + expenses
    // Also include opening balances from bank_balances table for configured banks
    const bankReceivedRows = await getAll(`
      SELECT COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified') as bank_name,
        COALESCE(SUM(amount),0) as received
      FROM payments WHERE mode='bank' AND direction='receive'
      GROUP BY COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified')
    `);
    const bankPayOutRows = await getAll(`
      SELECT COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified') as bank_name,
        COALESCE(SUM(amount),0) as paid_out
      FROM payments WHERE mode='bank' AND direction='pay'
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
      ...bankReceivedRows.map((r: any) => r.bank_name),
      ...bankPayOutRows.map((r: any) => r.bank_name),
      ...bankExpenseRows.map((r: any) => r.bank_name),
      ...bankOpeningRows.map((r: any) => r.bank_name),
    ]);

    const banks = Array.from(allNames).map((name: string) => {
      const received = Number(bankReceivedRows.find((r: any) => r.bank_name === name)?.received ?? 0);
      const paidOut = Number(bankPayOutRows.find((r: any) => r.bank_name === name)?.paid_out ?? 0);
      const expense = Number(bankExpenseRows.find((r: any) => r.bank_name === name)?.paid ?? 0);
      const totalPaid = paidOut + expense;
      const ob = Number(bankOpeningRows.find((r: any) =>
        r.bank_name?.toLowerCase() === name.toLowerCase()
      )?.opening_balance ?? 0);
      return { bank_name: name, opening: ob, total_received: received, total_paid: totalPaid, balance: ob + received - totalPaid };
    }).sort((a: any, b: any) => b.balance - a.balance);

    const bankLoanDisbursed = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM party_loans WHERE mode='bank' AND type='disbursement'`))?.t ?? 0);
    const bankLoanRepaid = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM party_loans WHERE mode='bank' AND type='repayment'`))?.t ?? 0);

    // Total bank = opening balances + received payments - paid-out payments - expenses - loan disbursements + loan repayments
    const totalBank =
      Number((await getOne(`SELECT COALESCE(SUM(opening_balance),0) as t FROM bank_balances`))?.t ?? 0) +
      Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE mode='bank' AND direction='receive'`))?.t ?? 0) -
      Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE mode='bank' AND direction='pay'`))?.t ?? 0) -
      Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE mode='bank'`))?.t ?? 0) -
      bankLoanDisbursed + bankLoanRepaid;

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

    // Outstanding receivable = customers owe us (exclude suppliers)
    const outstandingCalc = await getOne(`
      SELECT COALESCE(SUM(GREATEST(0,
        COALESCE(p.opening_balance,0)
        + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=p.id),0)
        - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id),0)
      )),0) as total FROM parties p WHERE p.type != 'supplier'
    `);
    // Outstanding payable = we owe suppliers
    const payableCalc = await getOne(`
      SELECT COALESCE(SUM(GREATEST(0,
        COALESCE(p.opening_balance,0)
        + COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id=p.id),0)
        - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id=p.id),0)
      )),0) as total FROM parties p WHERE p.type = 'supplier'
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
      totalPayable: Number(payableCalc?.total ?? 0),
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

router.delete('/banks/:name', requirePermission('delete_capital_banks'), async (req, res) => {
  try {
    await query('DELETE FROM bank_balances WHERE bank_name=$1', [req.params.name]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
