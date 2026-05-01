import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { requirePermission } from '../middleware/auth';

const router = Router();

router.get('/summary', async (_req, res) => {
  try {
    // Fire every aggregate in parallel — most of these scale with one indexed scan,
    // so the bottleneck becomes the slowest single query rather than the sum.
    const num = (v: any) => Number(v ?? 0);
    const [
      handlers,
      payAggs,
      expAggs,
      truckExpAggs,
      driverPayAggs,
      transporterPayAggs,
      partyLoansAggs,
      loanRepayAggs,
      assetsAggs,
      walletAggs,
      fastagAggs,
      bankReceivedRows,
      bankPayOutRows,
      bankExpenseRows,
      bankOpeningRows,
      bankTransferInRows,
      bankTransferOutRows,
      stockCalc,
      outstandingCalc,
      payableCalc,
      loansCalc,
      loansGivenCalc,
    ] = await Promise.all([
      getAll(`
        SELECT ih.handler_name, ih.opening_balance,
          COALESCE((SELECT SUM(credit) FROM imprest_transactions WHERE handler_name=ih.handler_name),0) as total_received,
          COALESCE((SELECT SUM(debit) FROM imprest_transactions WHERE handler_name=ih.handler_name),0) as total_spent
        FROM imprest_handlers ih ORDER BY ih.handler_name
      `),
      getOne(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND direction='receive' AND cash_handler IS NULL),0) as cash_orphan_recv,
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND direction='pay'     AND cash_handler IS NULL),0) as cash_orphan_pay,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank' AND direction='receive'),0) as bank_recv,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank' AND direction='pay'),0)     as bank_pay
        FROM payments
        WHERE mode IN ('cash','bank')
      `),
      getOne(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND cash_handler IS NULL),0) as cash_orphan,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank'),0) as bank
        FROM expenses
      `),
      getOne(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND cash_handler IS NULL),0) as cash_orphan,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank'),0) as bank
        FROM truck_expenses
      `),
      getOne(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND cash_handler IS NULL),0) as cash_orphan,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank'),0) as bank
        FROM driver_payments
      `),
      getOne(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND cash_handler IS NULL AND COALESCE(payment_type,'paid')='paid'),0) as cash_orphan_paid,
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND cash_handler IS NULL AND payment_type='received'),0)               as cash_orphan_recv,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank' AND COALESCE(payment_type,'paid')='paid'),0) as bank_paid,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank' AND payment_type='received'),0)              as bank_recv
        FROM transporter_payments
      `),
      getOne(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND type='disbursement' AND cash_handler IS NULL),0) as cash_disbursed,
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND type='repayment'    AND cash_handler IS NULL),0) as cash_repaid,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank' AND type='disbursement'),0) as bank_disbursed,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank' AND type='repayment'),0)    as bank_repaid
        FROM party_loans
      `),
      getOne(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND cash_handler IS NULL),0) as cash_orphan,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank'),0) as bank
        FROM loan_repayments
      `),
      getOne(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND cash_handler IS NULL),0) as cash_orphan,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank'),0) as bank,
          COALESCE(SUM(amount),0) as total
        FROM assets
      `),
      getOne(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE mode='cash' AND cash_handler IS NULL),0) as cash_orphan,
          COALESCE(SUM(amount) FILTER (WHERE mode='bank'),0) as bank
        FROM wallet_transactions WHERE type='credit'
      `),
      getOne(`
        SELECT COALESCE(SUM(amount),0) as bank
        FROM fastag_transactions WHERE type='credit'
      `),
      getAll(`
        SELECT COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified') as bank_name, COALESCE(SUM(amount),0) as received
        FROM (
          SELECT bank_name, amount FROM payments WHERE mode='bank' AND direction='receive'
          UNION ALL SELECT bank_name, amount FROM party_loans WHERE mode='bank' AND type='repayment'
          UNION ALL SELECT bank_name, amount FROM transporter_payments WHERE mode='bank' AND payment_type='received'
        ) combined
        GROUP BY COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified')
      `),
      getAll(`
        SELECT COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified') as bank_name, COALESCE(SUM(amount),0) as paid_out
        FROM payments WHERE mode='bank' AND direction='pay'
        GROUP BY COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified')
      `),
      getAll(`
        SELECT COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified') as bank_name, COALESCE(SUM(amount),0) as paid
        FROM (
          SELECT bank_name, amount FROM expenses WHERE mode='bank'
          UNION ALL SELECT bank_name, amount FROM truck_expenses WHERE mode='bank'
          UNION ALL SELECT bank_name, amount FROM driver_payments WHERE mode='bank'
          UNION ALL SELECT bank_name, amount FROM transporter_payments WHERE mode='bank' AND COALESCE(payment_type,'paid')='paid'
          UNION ALL SELECT bank_name, amount FROM assets WHERE mode='bank'
          UNION ALL SELECT bank_name, amount FROM party_loans WHERE mode='bank' AND type='disbursement'
          UNION ALL SELECT bank_name, amount FROM loan_repayments WHERE mode='bank'
          UNION ALL SELECT bank_name, amount FROM wallet_transactions WHERE mode='bank' AND type='credit'
          UNION ALL SELECT bank_name, amount FROM fastag_transactions WHERE bank_name IS NOT NULL AND type='credit'
        ) combined
        GROUP BY COALESCE(NULLIF(TRIM(bank_name),''), 'Unspecified')
      `),
      getAll(`SELECT bank_name, opening_balance FROM bank_balances`),
      getAll(`SELECT TRIM(to_bank) as bank_name, COALESCE(SUM(amount),0) as received FROM bank_transfers GROUP BY TRIM(to_bank)`),
      getAll(`SELECT TRIM(from_bank) as bank_name, COALESCE(SUM(amount),0) as paid_out FROM bank_transfers GROUP BY TRIM(from_bank)`),
      getOne(`
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
      `),
      // Outstanding receivable: rewritten as a sum of non-correlated aggregates so the planner
      // can use plain index scans instead of one correlated subquery per party row.
      // Excludes both suppliers (they're payables) and suspense (tracked separately).
      getOne(`
        SELECT (
          (SELECT COALESCE(SUM(CASE WHEN COALESCE(opening_balance_type,'dr')='dr' THEN COALESCE(opening_balance,0) ELSE -COALESCE(opening_balance,0) END),0) FROM parties WHERE type NOT IN ('supplier','suspense'))
          + (SELECT COALESCE(SUM(s.sale_amount),0) FROM sales s JOIN parties p ON p.id=s.party_id WHERE p.type NOT IN ('supplier','suspense'))
          + (SELECT COALESCE(SUM(pm.amount),0)    FROM payments pm JOIN parties p ON p.id=pm.party_id WHERE p.type NOT IN ('supplier','suspense') AND pm.direction='pay')
          - (SELECT COALESCE(SUM(pm.amount),0)    FROM payments pm JOIN parties p ON p.id=pm.party_id WHERE p.type NOT IN ('supplier','suspense') AND (pm.direction='receive' OR pm.direction IS NULL))
          + (SELECT COALESCE(SUM(pl.amount),0)    FROM party_loans pl JOIN parties p ON p.id=pl.party_id WHERE p.type NOT IN ('supplier','suspense') AND pl.type='disbursement')
          - (SELECT COALESCE(SUM(pl.amount),0)    FROM party_loans pl JOIN parties p ON p.id=pl.party_id WHERE p.type NOT IN ('supplier','suspense') AND pl.type='repayment')
        ) as total
      `),
      getOne(`
        SELECT (
          (SELECT COALESCE(SUM(CASE WHEN COALESCE(opening_balance_type,'cr')='cr' THEN COALESCE(opening_balance,0) ELSE -COALESCE(opening_balance,0) END),0) FROM parties WHERE type='supplier')
          + (SELECT COALESCE(SUM(pu.purchase_amount),0) FROM purchases pu JOIN parties p ON p.id=pu.supplier_id WHERE p.type='supplier')
          + (SELECT COALESCE(SUM(pm.amount),0)          FROM payments pm  JOIN parties p ON p.id=pm.party_id    WHERE p.type='supplier' AND pm.direction='receive')
          - (SELECT COALESCE(SUM(pm.amount),0)          FROM payments pm  JOIN parties p ON p.id=pm.party_id    WHERE p.type='supplier' AND (pm.direction='pay' OR pm.direction IS NULL))
          - (SELECT COALESCE(SUM(s.sale_amount),0)      FROM sales s      JOIN parties p ON p.id=s.party_id     WHERE p.type='supplier')
        ) as total
      `),
      getOne(`SELECT COALESCE(SUM(COALESCE(outstanding_principal, principal)),0) as total FROM loans`),
      getOne(`
        SELECT
          COALESCE(SUM(CASE WHEN type='disbursement' THEN amount ELSE 0 END),0)
          - COALESCE(SUM(CASE WHEN type='repayment'  THEN amount ELSE 0 END),0) AS total
        FROM party_loans
      `),
    ]);

    // Cash assembly
    const cash = handlers.map((h: any) => ({
      handler: h.handler_name,
      opening: num(h.opening_balance),
      total_received: num(h.total_received),
      total_spent: num(h.total_spent),
      balance: num(h.opening_balance) + num(h.total_received) - num(h.total_spent),
    }));
    const imprestCash = cash.reduce((s: number, h: any) => s + h.balance, 0);
    const totalCash = imprestCash
      + num(payAggs.cash_orphan_recv) - num(payAggs.cash_orphan_pay)
      - num(expAggs.cash_orphan)
      - num(partyLoansAggs.cash_disbursed) + num(partyLoansAggs.cash_repaid)
      - num(truckExpAggs.cash_orphan) - num(driverPayAggs.cash_orphan)
      - num(transporterPayAggs.cash_orphan_paid) + num(transporterPayAggs.cash_orphan_recv)
      - num(loanRepayAggs.cash_orphan)
      - num(assetsAggs.cash_orphan)
      - num(walletAggs?.cash_orphan);

    // Bank assembly — per-bank rollup
    const allNames = new Set<string>([
      ...bankReceivedRows.map((r: any) => r.bank_name),
      ...bankPayOutRows.map((r: any) => r.bank_name),
      ...bankExpenseRows.map((r: any) => r.bank_name),
      ...bankOpeningRows.map((r: any) => r.bank_name),
      ...bankTransferInRows.map((r: any) => r.bank_name),
      ...bankTransferOutRows.map((r: any) => r.bank_name),
    ]);
    const banks = Array.from(allNames).map((name: string) => {
      const lname = name?.toLowerCase();
      const received = num(bankReceivedRows.find((r: any) => r.bank_name === name)?.received);
      const paidOut = num(bankPayOutRows.find((r: any) => r.bank_name === name)?.paid_out);
      const expense = num(bankExpenseRows.find((r: any) => r.bank_name === name)?.paid);
      const transferIn = num(bankTransferInRows.find((r: any) => r.bank_name?.toLowerCase() === lname)?.received);
      const transferOut = num(bankTransferOutRows.find((r: any) => r.bank_name?.toLowerCase() === lname)?.paid_out);
      const ob = num(bankOpeningRows.find((r: any) => r.bank_name?.toLowerCase() === lname)?.opening_balance);
      const totalReceived = received + transferIn;
      const totalPaid = paidOut + expense + transferOut;
      return { bank_name: name, opening: ob, total_received: totalReceived, total_paid: totalPaid, balance: ob + totalReceived - totalPaid };
    }).sort((a: any, b: any) => b.balance - a.balance);

    const bankOpeningTotal = bankOpeningRows.reduce((s: number, r: any) => s + num(r.opening_balance), 0);
    const totalBank =
      bankOpeningTotal
      + num(payAggs.bank_recv) - num(payAggs.bank_pay)
      - num(expAggs.bank) - num(truckExpAggs.bank) - num(driverPayAggs.bank)
      - num(transporterPayAggs.bank_paid) + num(transporterPayAggs.bank_recv)
      - num(partyLoansAggs.bank_disbursed) + num(partyLoansAggs.bank_repaid)
      - num(loanRepayAggs.bank)
      - num(assetsAggs.bank)
      - num(walletAggs?.bank)
      - num(fastagAggs?.bank);

    res.json({
      cash,
      totalCash,
      banks,
      totalBank,
      stockValue: { value: num(stockCalc?.value), bags: num(stockCalc?.bags) },
      totalOutstanding: num(outstandingCalc?.total),
      totalPayable: num(payableCalc?.total),
      totalLoans: num(loansCalc?.total),
      totalLoansGiven: num(loansGivenCalc?.total),
      totalAssets: num(assetsAggs?.total),
      totalCapital: totalCash + totalBank,
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.get('/banks', async (_req, res) => {
  try {
    const rows = await getAll(`SELECT * FROM bank_balances ORDER BY bank_name`);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
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
        SELECT te.date, COALESCE('Truck expense — '||te.category,'Truck expense'),
          COALESCE(t.truck_number, te.description),
          'truck_expense', te.id, 0, te.amount
        FROM truck_expenses te
        LEFT JOIN trucks t ON t.id = te.truck_id
        WHERE te.mode='bank' AND TRIM(LOWER(COALESCE(te.bank_name,'')))=TRIM(LOWER($1))

        UNION ALL
        SELECT dp.date, 'Driver payment', d.name, 'driver_payment', dp.id, 0, dp.amount
        FROM driver_payments dp
        LEFT JOIN drivers d ON d.id = dp.driver_id
        WHERE dp.mode='bank' AND TRIM(LOWER(COALESCE(dp.bank_name,'')))=TRIM(LOWER($1))

        UNION ALL
        SELECT tp.date,
          CASE WHEN COALESCE(tp.payment_type,'paid')='paid' THEN 'Transporter paid' ELSE 'Transporter received' END,
          tr.name, 'transporter_payment', tp.id,
          CASE WHEN tp.payment_type='received' THEN tp.amount ELSE 0 END,
          CASE WHEN COALESCE(tp.payment_type,'paid')='paid' THEN tp.amount ELSE 0 END
        FROM transporter_payments tp
        LEFT JOIN transporters tr ON tr.id = tp.transporter_id
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

        UNION ALL
        SELECT date, COALESCE('Asset — '||name,'Asset purchase'), type, 'asset', id, 0, amount
        FROM assets
        WHERE mode='bank' AND TRIM(LOWER(COALESCE(bank_name,'')))=TRIM(LOWER($1))

        UNION ALL
        SELECT date, 'Transfer in', 'From '||from_bank, 'bank_transfer', id, amount, 0
        FROM bank_transfers
        WHERE TRIM(LOWER(to_bank))=TRIM(LOWER($1))

        UNION ALL
        SELECT date, 'Transfer out', 'To '||to_bank, 'bank_transfer', id, 0, amount
        FROM bank_transfers
        WHERE TRIM(LOWER(from_bank))=TRIM(LOWER($1))
      ) x
      ORDER BY date DESC, source_id DESC
      LIMIT 500
      `,
      [bank]
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
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
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/banks/:name', requirePermission('delete_capital_banks'), async (req, res) => {
  try {
    await query('DELETE FROM bank_balances WHERE bank_name=$1', [req.params.name]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
