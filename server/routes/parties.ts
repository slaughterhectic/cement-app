import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { friendlyError } from '../lib/userError';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const parties = await getAll(`
      SELECT p.*,
        COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0) as total_sales,
        COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id = p.id), 0) as total_purchases,
        COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id), 0) as total_paid,
        CASE
          WHEN p.type = 'suspense' THEN
            -- Suspense balance = direct payments + payments routed via this suspense (sign-flipped)
            CASE WHEN COALESCE(p.opening_balance_type,'dr') = 'dr' THEN COALESCE(p.opening_balance,0)
                 ELSE -COALESCE(p.opening_balance,0) END
            + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND direction = 'pay'), 0)
            - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND (direction = 'receive' OR direction IS NULL)), 0)
            + COALESCE((SELECT SUM(amount) FROM payments WHERE suspense_party_id = p.id AND (direction = 'receive' OR direction IS NULL)), 0)
            - COALESCE((SELECT SUM(amount) FROM payments WHERE suspense_party_id = p.id AND direction = 'pay'), 0)
          WHEN p.type = 'supplier' THEN
            -- Supplier outstanding = we owe them (positive). cr opening = we owe them, dr = they owe us (advance)
            CASE WHEN COALESCE(p.opening_balance_type,'cr') = 'cr' THEN COALESCE(p.opening_balance,0)
                 ELSE -COALESCE(p.opening_balance,0) END
            + COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id = p.id), 0)
            + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND direction = 'receive'), 0)
            - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND (direction = 'pay' OR direction IS NULL)), 0)
            - COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0)
          ELSE
            -- Non-supplier outstanding = they owe us (positive). dr opening = they owe us, cr = we owe them
            CASE WHEN COALESCE(p.opening_balance_type,'dr') = 'dr' THEN COALESCE(p.opening_balance,0)
                 ELSE -COALESCE(p.opening_balance,0) END
            + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0)
            + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND direction = 'pay'), 0)
            - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND (direction = 'receive' OR direction IS NULL)), 0)
            - COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id = p.id), 0)
            + COALESCE((SELECT SUM(amount) FROM party_loans WHERE party_id = p.id AND type='disbursement'), 0)
            - COALESCE((SELECT SUM(amount) FROM party_loans WHERE party_id = p.id AND type='repayment'), 0)
        END as outstanding,
        (SELECT MAX(d) FROM (
          SELECT date as d FROM sales WHERE party_id = p.id
          UNION ALL SELECT date FROM payments WHERE party_id = p.id
          UNION ALL SELECT date FROM purchases WHERE supplier_id = p.id
        ) sub) as last_transaction
      FROM parties p ORDER BY p.name
    `);
    res.json(parties);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.post('/', async (req, res) => {
  const { name, phone, location, district, type, opening_balance, opening_balance_type } = req.body;
  try {
    const result = await getOne(
      'INSERT INTO parties (name, phone, location, district, type, opening_balance, opening_balance_type) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, phone, location, district, type, opening_balance || 0, opening_balance_type || 'dr']
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.put('/:id', async (req, res) => {
  const { name, phone, location, district, type, opening_balance, opening_balance_type } = req.body;
  try {
    const result = await getOne(
      'UPDATE parties SET name=$1, phone=$2, location=$3, district=$4, type=$5, opening_balance=$6, opening_balance_type=$7 WHERE id=$8 RETURNING *',
      [name, phone, location, district, type, opening_balance || 0, opening_balance_type || 'dr', req.params.id]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const used = await getOne(
      `SELECT 1 FROM (
        SELECT party_id as pid FROM sales WHERE party_id=$1
        UNION ALL SELECT party_id FROM payments WHERE party_id=$1
        UNION ALL SELECT supplier_id FROM purchases WHERE supplier_id=$1
      ) t LIMIT 1`,
      [req.params.id]
    );
    if (used) return res.status(400).json({ error: 'Cannot delete: party has existing transactions. Remove all sales, payments, and purchases first.' });
    await query('DELETE FROM parties WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.get('/:id/summary', async (req, res) => {
  try {
    const party = await getOne('SELECT * FROM parties WHERE id=$1', [req.params.id]);
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const isSupplier = party.type === 'supplier';

    const totals = await getOne(`
      SELECT
        COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=$1), 0) as total_sales,
        COALESCE((SELECT SUM(bags) FROM sales WHERE party_id=$1), 0) as total_bags,
        COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=$1), 0) as total_paid,
        COALESCE((SELECT SUM(purchase_amount) FROM purchases WHERE supplier_id=$1), 0) as total_purchases,
        COALESCE((SELECT SUM(bags) FROM purchases WHERE supplier_id=$1), 0) as total_purchase_bags
    `, [party.id]);

    const paidToThem = isSupplier
      ? await getOne(`SELECT COALESCE(SUM(amount),0) as v FROM payments WHERE party_id=$1 AND (direction='pay' OR direction IS NULL)`, [party.id]).then((r: any) => Number(r.v))
      : await getOne(`SELECT COALESCE(SUM(amount),0) as v FROM payments WHERE party_id=$1 AND direction='pay'`, [party.id]).then((r: any) => Number(r.v));
    const receivedFromThem = isSupplier
      ? await getOne(`SELECT COALESCE(SUM(amount),0) as v FROM payments WHERE party_id=$1 AND direction='receive'`, [party.id]).then((r: any) => Number(r.v))
      : await getOne(`SELECT COALESCE(SUM(amount),0) as v FROM payments WHERE party_id=$1 AND (direction='receive' OR direction IS NULL)`, [party.id]).then((r: any) => Number(r.v));

    const partyLoanDisbursed = isSupplier ? 0 : await getOne(
      `SELECT COALESCE(SUM(amount),0) as v FROM party_loans WHERE party_id=$1 AND type='disbursement'`,
      [party.id]
    ).then((r: any) => Number(r.v));
    const partyLoanRepaid = isSupplier ? 0 : await getOne(
      `SELECT COALESCE(SUM(amount),0) as v FROM party_loans WHERE party_id=$1 AND type='repayment'`,
      [party.id]
    ).then((r: any) => Number(r.v));

    const obType = party.opening_balance_type || (isSupplier ? 'cr' : 'dr');
    const effOpening = obType === (isSupplier ? 'cr' : 'dr')
      ? (party.opening_balance || 0)
      : -(party.opening_balance || 0);
    const outstanding = isSupplier
      ? effOpening + Number(totals.total_purchases) + receivedFromThem - paidToThem - Number(totals.total_sales)
      : effOpening + Number(totals.total_sales) + paidToThem - receivedFromThem + partyLoanDisbursed - partyLoanRepaid;

    res.json({
      ...party,
      total_sales: Number(totals.total_sales),
      total_bags: Number(isSupplier ? totals.total_purchase_bags : totals.total_bags),
      total_paid: Number(totals.total_paid),
      total_purchases: Number(totals.total_purchases),
      outstanding,
    });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.get('/:id/ledger', async (req, res) => {
  try {
    const party = await getOne('SELECT * FROM parties WHERE id=$1', [req.params.id]);
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const isSupplier = party.type === 'supplier';
    const isSuspense = party.type === 'suspense';

    let entries: any[] = [];

    if (isSuspense) {
      // Suspense ledger = direct payments to/from this entity AND payments to other parties
      // routed through this suspense (suspense_party_id = this party).
      const directPayments = await getAll(`
        SELECT p.date,
          ('Direct payment - ' || COALESCE(p.mode,'bank')
            || CASE WHEN p.bank_name IS NOT NULL THEN ' (' || p.bank_name || ')' ELSE '' END
            || CASE WHEN p.direction='pay' THEN ' [Paid to suspense]' ELSE ' [Received from suspense]' END
          ) AS particulars,
          0 AS qty, 0 AS rate,
          CASE WHEN p.direction='pay'    THEN p.amount ELSE 0 END AS debit,
          CASE WHEN p.direction='receive' OR p.direction IS NULL THEN p.amount ELSE 0 END AS credit,
          'payment' AS entry_type, p.id
        FROM payments p WHERE p.party_id = $1
      `, [party.id]);
      // Payments routed through this suspense — flip debit/credit to reflect suspense's POV.
      // direction='pay'    → we paid party X via suspense → suspense owes us less (credit on suspense side)
      // direction='receive'→ party X paid us via suspense → suspense advanced us (debit on suspense side)
      const viaSuspense = await getAll(`
        SELECT p.date,
          ('Via Suspense → ' || COALESCE(pa.name,'unknown')
            || CASE WHEN p.direction='pay' THEN ' [Paid on our behalf]' ELSE ' [Collected on our behalf]' END
          ) AS particulars,
          0 AS qty, 0 AS rate,
          CASE WHEN p.direction='receive' OR p.direction IS NULL THEN p.amount ELSE 0 END AS debit,
          CASE WHEN p.direction='pay' THEN p.amount ELSE 0 END AS credit,
          'payment_via_suspense' AS entry_type, p.id
        FROM payments p LEFT JOIN parties pa ON pa.id = p.party_id
        WHERE p.suspense_party_id = $1
      `, [party.id]);
      entries = [...directPayments, ...viaSuspense];
    } else if (isSupplier) {
      // Purchases = credit (they supplied goods, we owe them)
      const purchases = await getAll(`
        SELECT pu.date, cb.name as particulars, pu.bags as qty, pu.purchase_rate as rate,
          0 as debit, pu.purchase_amount as credit, 'purchase' as entry_type, pu.id
        FROM purchases pu
        LEFT JOIN cement_brands cb ON pu.brand_id = cb.id
        WHERE pu.supplier_id = $1
      `, [party.id]);

      // Sales = debit (we sold to them, they owe us)
      const sales = await getAll(`
        SELECT s.date, cb.name as particulars, s.bags as qty, s.sale_rate as rate,
          s.sale_amount as debit, 0 as credit, 'sale' as entry_type, s.id
        FROM sales s JOIN cement_brands cb ON s.brand_id = cb.id
        WHERE s.party_id = $1
      `, [party.id]);

      // Payments — direction decides column:
      //   direction='pay' or null → DEBIT  (we paid them)
      //   direction='receive'     → CREDIT (they paid us for sales)
      const payments = await getAll(`
        SELECT p.date,
          ('Payment - ' || COALESCE(p.mode, 'bank')
            || CASE WHEN p.bank_name IS NOT NULL THEN ' (' || p.bank_name || ')' ELSE '' END
            || CASE WHEN p.direction='receive' THEN ' [Received]' ELSE ' [Paid to them]' END
          ) as particulars,
          0 as qty, 0 as rate,
          CASE WHEN p.direction = 'receive' THEN 0 ELSE p.amount END as debit,
          CASE WHEN p.direction = 'receive' THEN p.amount ELSE 0 END as credit,
          'payment' as entry_type, p.id
        FROM payments p WHERE p.party_id = $1
      `, [party.id]);

      entries = [...purchases, ...sales, ...payments];
    } else {
      // Sales = debit (customer owes us)
      const sales = await getAll(`
        SELECT s.date, cb.name as particulars, s.bags as qty, s.sale_rate as rate,
          s.sale_amount as debit, 0 as credit, 'sale' as entry_type, s.id
        FROM sales s JOIN cement_brands cb ON s.brand_id = cb.id
        WHERE s.party_id = $1
      `, [party.id]);

      // Payments — direction decides column:
      //   direction='pay'     → DEBIT  (we paid them / gave advance; increases what they owe us)
      //   direction='receive' → CREDIT (they paid us; reduces what they owe us)
      const payments = await getAll(`
        SELECT p.date,
          ('Payment - ' || COALESCE(p.mode, 'bank')
            || CASE WHEN p.bank_name IS NOT NULL THEN ' (' || p.bank_name || ')' ELSE '' END
            || CASE WHEN p.direction='pay' THEN ' [Paid to them]' ELSE ' [Received]' END
          ) as particulars,
          0 as qty, 0 as rate,
          CASE WHEN p.direction = 'pay' THEN p.amount ELSE 0 END as debit,
          CASE WHEN p.direction = 'receive' OR p.direction IS NULL THEN p.amount ELSE 0 END as credit,
          'payment' as entry_type, p.id
        FROM payments p WHERE p.party_id = $1
      `, [party.id]);

      // Party loans: disbursement = debit (we gave, they owe us), repayment = credit
      const partyLoans = await getAll(`
        SELECT pl.date,
          CASE WHEN pl.type='disbursement' THEN 'Loan Disbursed' ELSE 'Loan Repayment' END as particulars,
          0 as qty, 0 as rate,
          CASE WHEN pl.type='disbursement' THEN pl.amount ELSE 0 END as debit,
          CASE WHEN pl.type='repayment' THEN pl.amount ELSE 0 END as credit,
          'party_loan' as entry_type, pl.id
        FROM party_loans pl WHERE pl.party_id = $1
      `, [party.id]);

      entries = [...sales, ...payments, ...partyLoans];
    }

    const ledger = entries.sort((a: any, b: any) => {
      if (a.date === b.date) {
        // purchases/sales before payments on same day
        if (a.entry_type === 'payment') return 1;
        if (b.entry_type === 'payment') return -1;
        return 0;
      }
      return a.date.localeCompare(b.date);
    });

    // dr = they owe us (positive for dealer, negative for supplier), cr = we owe them (positive for supplier, negative for dealer)
    const obType = party.opening_balance_type || (isSupplier ? 'cr' : 'dr');
    const positiveDir = isSupplier ? 'cr' : 'dr';
    let balance = obType === positiveDir ? (party.opening_balance || 0) : -(party.opening_balance || 0);
    const ledgerWithBalance = ledger.map((entry: any, idx: number) => {
      if (isSupplier) {
        // credit increases balance (we owe more), debit decreases (we paid)
        balance = balance + Number(entry.credit || 0) - Number(entry.debit || 0);
      } else {
        // debit increases balance (customer owes more), credit decreases (they paid)
        balance = balance + Number(entry.debit || 0) - Number(entry.credit || 0);
      }
      return { ...entry, sno: idx + 1, balance };
    });

    res.json({ party, opening_balance: party.opening_balance || 0, ledger: ledgerWithBalance });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
