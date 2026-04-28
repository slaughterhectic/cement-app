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

    // Cash is ALWAYS attributed to a handler now — so imprestCash is the single source of truth.
    // We still count orphan cash flows that have mode='cash' but no cash_handler (legacy rows or
    // entries where the user didn't pick a handler) so nothing silently disappears.
    const orphanCashReceived = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE mode='cash' AND direction='receive' AND cash_handler IS NULL`))?.t ?? 0);
    const orphanCashPaidOut = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE mode='cash' AND direction='pay' AND cash_handler IS NULL`))?.t ?? 0);
    const orphanCashExpenses = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE mode='cash' AND cash_handler IS NULL`))?.t ?? 0);
    const cashLoanDisbursed = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM party_loans WHERE mode='cash' AND type='disbursement'`))?.t ?? 0);
    const cashLoanRepaid = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM party_loans WHERE mode='cash' AND type='repayment'`))?.t ?? 0);
    const cashBusinessLoanRepaid = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM loan_repayments WHERE mode='cash' AND cash_handler IS NULL`))?.t ?? 0);
    const orphanTruckCashExpenses = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM truck_expenses WHERE mode='cash' AND cash_handler IS NULL`))?.t ?? 0);
    const orphanDriverCashPayments = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM driver_payments WHERE mode='cash' AND cash_handler IS NULL`))?.t ?? 0);
    const orphanTransporterCashPaid = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM transporter_payments WHERE mode='cash' AND cash_handler IS NULL AND COALESCE(payment_type,'paid')='paid'`))?.t ?? 0);
    const orphanTransporterCashReceived = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM transporter_payments WHERE mode='cash' AND cash_handler IS NULL AND payment_type='received'`))?.t ?? 0);
    const totalCash = imprestCash
      + orphanCashReceived - orphanCashPaidOut - orphanCashExpenses
      - cashLoanDisbursed + cashLoanRepaid
      - orphanTruckCashExpenses - orphanDriverCashPayments
      - orphanTransporterCashPaid + orphanTransporterCashReceived
      - cashBusinessLoanRepaid;

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
      FROM (
        SELECT bank_name, amount FROM expenses WHERE mode='bank'
        UNION ALL
        SELECT bank_name, amount FROM truck_expenses WHERE mode='bank'
        UNION ALL
        SELECT bank_name, amount FROM driver_payments WHERE mode='bank'
        UNION ALL
        SELECT bank_name, amount FROM transporter_payments WHERE mode='bank' AND COALESCE(payment_type,'paid')='paid'
      ) combined
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
    const bankBusinessLoanRepaid = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM loan_repayments WHERE mode='bank'`))?.t ?? 0);
    const truckBankExpenses = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM truck_expenses WHERE mode='bank'`))?.t ?? 0);
    const driverBankPayments = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM driver_payments WHERE mode='bank'`))?.t ?? 0);
    const transporterBankPaid = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM transporter_payments WHERE mode='bank' AND COALESCE(payment_type,'paid')='paid'`))?.t ?? 0);
    const transporterBankReceived = Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM transporter_payments WHERE mode='bank' AND payment_type='received'`))?.t ?? 0);

    // Total bank = opening balances + received payments - paid-out payments - expenses (all sources) - loan disbursements + loan repayments
    const totalBank =
      Number((await getOne(`SELECT COALESCE(SUM(opening_balance),0) as t FROM bank_balances`))?.t ?? 0) +
      Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE mode='bank' AND direction='receive'`))?.t ?? 0) -
      Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE mode='bank' AND direction='pay'`))?.t ?? 0) -
      Number((await getOne(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE mode='bank'`))?.t ?? 0) -
      truckBankExpenses - driverBankPayments -
      transporterBankPaid + transporterBankReceived -
      bankLoanDisbursed + bankLoanRepaid -
      bankBusinessLoanRepaid;

    // Stock value — includes opening stock (bags + cost) from godown_opening_stock.
    // Average rate is weighted across opening-stock rates and purchase rates.
    const stockCalc = await getOne(`
      SELECT COALESCE(SUM(sub.stock * sub.avg_rate),0) as value, COALESCE(SUM(sub.stock),0) as bags FROM (
        SELECT cb.id,
          (COALESCE((SELECT SUM(bags) FROM godown_opening_stock WHERE brand_id=cb.id),0)
           + COALESCE((SELECT SUM(bags) FROM purchases          WHERE brand_id=cb.id),0)
           - COALESCE((SELECT SUM(bags) FROM sales              WHERE brand_id=cb.id),0)) as stock,
          COALESCE(
            (COALESCE((SELECT SUM(bags * rate)          FROM godown_opening_stock WHERE brand_id=cb.id),0)
           + COALESCE((SELECT SUM(bags * purchase_rate) FROM purchases            WHERE brand_id=cb.id),0))
            / NULLIF(
                COALESCE((SELECT SUM(bags) FROM godown_opening_stock WHERE brand_id=cb.id),0)
              + COALESCE((SELECT SUM(bags) FROM purchases            WHERE brand_id=cb.id),0), 0),
          0) as avg_rate
        FROM cement_brands cb
      ) sub WHERE sub.stock > 0
    `);

    // Outstanding receivable = NET sum of all non-supplier balances (includes overpayments and loans given)
    const outstandingCalc = await getOne(`
      SELECT COALESCE(SUM(
        CASE WHEN COALESCE(p.opening_balance_type,'dr') = 'dr' THEN COALESCE(p.opening_balance,0)
             ELSE -COALESCE(p.opening_balance,0) END
        + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=p.id),0)
        + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id AND direction='pay'),0)
        - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=p.id AND (direction='receive' OR direction IS NULL)),0)
        + COALESCE((SELECT SUM(amount) FROM party_loans WHERE party_id=p.id AND type='disbursement'),0)
        - COALESCE((SELECT SUM(amount) FROM party_loans WHERE party_id=p.id AND type='repayment'),0)
      ),0) as total FROM parties p WHERE p.type != 'supplier'
    `);
    // Outstanding payable = NET sum of all supplier balances (includes overpayments)
    const payableCalc = await getOne(`
      SELECT COALESCE(SUM(
        CASE WHEN COALESCE(p.opening_balance_type,'cr') = 'cr' THEN COALESCE(p.opening_balance,0)
             ELSE -COALESCE(p.opening_balance,0) END
        + COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id=p.id),0)
        + COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id=p.id AND pm.direction='receive'),0)
        - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id=p.id AND (pm.direction='pay' OR pm.direction IS NULL)),0)
        - COALESCE((SELECT SUM(s.sale_amount) FROM sales s WHERE s.party_id=p.id),0)
      ),0) as total FROM parties p WHERE p.type = 'supplier'
    `);

    // Loans outstanding (loans we have taken)
    const loansCalc = await getOne(`
      SELECT COALESCE(SUM(COALESCE(outstanding_principal, principal)),0) as total FROM loans
    `);

    // Loans given outstanding (party loans disbursed - repaid)
    const loansGivenCalc = await getOne(`
      SELECT
        COALESCE(SUM(CASE WHEN type='disbursement' THEN amount ELSE 0 END),0)
        - COALESCE(SUM(CASE WHEN type='repayment' THEN amount ELSE 0 END),0) AS total
      FROM party_loans
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
      totalLoansGiven: Number(loansGivenCalc?.total ?? 0),
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

// All transactions hitting a single bank — payments in/out, expenses, truck/driver/transporter
// outflows, party loan disbursements/repayments, business-loan repayments. Newest first.
router.get('/banks/:name/transactions', async (req, res) => {
  const bank = req.params.name;
  try {
    const rows = await getAll(
      `
      SELECT date, particulars, counterparty, source, source_id, inflow, outflow FROM (
        -- Customer / supplier payments
        SELECT pm.date,
          CASE WHEN pm.direction='receive' THEN 'Payment received' ELSE 'Payment paid' END AS particulars,
          pa.name AS counterparty,
          'payment' AS source, pm.id AS source_id,
          CASE WHEN pm.direction='receive' THEN pm.amount ELSE 0 END AS inflow,
          CASE WHEN pm.direction='pay' OR pm.direction IS NULL THEN pm.amount ELSE 0 END AS outflow
        FROM payments pm
        LEFT JOIN parties pa ON pa.id = pm.party_id
        WHERE pm.mode='bank' AND TRIM(LOWER(COALESCE(pm.bank_name,'')))=TRIM(LOWER($1))

        UNION ALL
        SELECT date, COALESCE('Expense — '||category,'Expense'), description, 'expense', id, 0, amount
        FROM expenses
        WHERE mode='bank' AND TRIM(LOWER(COALESCE(bank_name,'')))=TRIM(LOWER($1))

        UNION ALL
        SELECT date, 'Truck expense', remark, 'truck_expense', id, 0, amount
        FROM truck_expenses
        WHERE mode='bank' AND TRIM(LOWER(COALESCE(bank_name,'')))=TRIM(LOWER($1))

        UNION ALL
        SELECT date, 'Driver payment', NULL, 'driver_payment', id, 0, amount
        FROM driver_payments
        WHERE mode='bank' AND TRIM(LOWER(COALESCE(bank_name,'')))=TRIM(LOWER($1))

        UNION ALL
        SELECT tp.date,
          CASE WHEN COALESCE(tp.payment_type,'paid')='paid' THEN 'Transporter paid' ELSE 'Transporter received' END,
          NULL, 'transporter_payment', tp.id,
          CASE WHEN tp.payment_type='received' THEN tp.amount ELSE 0 END,
          CASE WHEN COALESCE(tp.payment_type,'paid')='paid' THEN tp.amount ELSE 0 END
        FROM transporter_payments tp
        WHERE tp.mode='bank' AND TRIM(LOWER(COALESCE(tp.bank_name,'')))=TRIM(LOWER($1))

        UNION ALL
        SELECT pl.date,
          CASE WHEN pl.type='disbursement' THEN 'Loan disbursed (party)' ELSE 'Loan repayment (party)' END,
          pa.name, 'party_loan', pl.id,
          CASE WHEN pl.type='repayment' THEN pl.amount ELSE 0 END,
          CASE WHEN pl.type='disbursement' THEN pl.amount ELSE 0 END
        FROM party_loans pl
        LEFT JOIN parties pa ON pa.id = pl.party_id
        WHERE pl.mode='bank' AND TRIM(LOWER(COALESCE(pl.bank_name,'')))=TRIM(LOWER($1))

        UNION ALL
        SELECT lr.date, 'Business loan repayment', l.lender_name, 'loan_repayment', lr.id, 0, lr.amount
        FROM loan_repayments lr
        LEFT JOIN loans l ON l.id = lr.loan_id
        WHERE lr.mode='bank' AND TRIM(LOWER(COALESCE(lr.bank_name,'')))=TRIM(LOWER($1))
      ) x
      ORDER BY date DESC, source_id DESC
      LIMIT 500
      `,
      [bank]
    );
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
