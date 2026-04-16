import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const parties = await getAll(`
      SELECT p.*,
        COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0) as total_sales,
        COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id = p.id), 0) as total_purchases,
        COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id), 0) as total_paid,
        CASE
          WHEN p.type = 'supplier' THEN
            -- Supplier: purchases - opening_advance - all payments (opening = advance already paid by us)
            COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id = p.id), 0)
            - COALESCE(p.opening_balance, 0)
            - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id), 0)
          ELSE
            -- Non-supplier: opening + sales + paid_to_them(advances) - received_from_them
            COALESCE(p.opening_balance, 0)
            + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0)
            + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND direction = 'pay'), 0)
            - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id AND (direction = 'receive' OR direction IS NULL)), 0)
        END as outstanding,
        (SELECT MAX(d) FROM (
          SELECT date as d FROM sales WHERE party_id = p.id
          UNION ALL SELECT date FROM payments WHERE party_id = p.id
          UNION ALL SELECT date FROM purchases WHERE supplier_id = p.id
        ) sub) as last_transaction
      FROM parties p ORDER BY p.name
    `);
    res.json(parties);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { name, phone, location, district, type, opening_balance } = req.body;
  try {
    const result = await getOne(
      'INSERT INTO parties (name, phone, location, district, type, opening_balance) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, phone, location, district, type, opening_balance || 0]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { name, phone, location, district, type, opening_balance } = req.body;
  try {
    const result = await getOne(
      'UPDATE parties SET name=$1, phone=$2, location=$3, district=$4, type=$5, opening_balance=$6 WHERE id=$7 RETURNING *',
      [name, phone, location, district, type, opening_balance || 0, req.params.id]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
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
  } catch (e: any) { res.status(500).json({ error: e.message }); }
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

    const paidToThem = isSupplier ? Number(totals.total_paid) : await getOne(
      `SELECT COALESCE(SUM(amount),0) as v FROM payments WHERE party_id=$1 AND direction='pay'`, [party.id]
    ).then((r: any) => Number(r.v));
    const receivedFromThem = isSupplier ? 0 : await getOne(
      `SELECT COALESCE(SUM(amount),0) as v FROM payments WHERE party_id=$1 AND (direction='receive' OR direction IS NULL)`, [party.id]
    ).then((r: any) => Number(r.v));

    const outstanding = isSupplier
      ? Number(totals.total_purchases) - (party.opening_balance || 0) - Number(totals.total_paid)
      : (party.opening_balance || 0) + Number(totals.total_sales) + paidToThem - receivedFromThem;

    res.json({
      ...party,
      total_sales: Number(totals.total_sales),
      total_bags: Number(isSupplier ? totals.total_purchase_bags : totals.total_bags),
      total_paid: Number(totals.total_paid),
      total_purchases: Number(totals.total_purchases),
      outstanding,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/ledger', async (req, res) => {
  try {
    const party = await getOne('SELECT * FROM parties WHERE id=$1', [req.params.id]);
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const isSupplier = party.type === 'supplier';

    let entries: any[] = [];

    if (isSupplier) {
      // Purchases = credit (they supplied goods, we owe them)
      const purchases = await getAll(`
        SELECT pu.date, cb.name as particulars, pu.bags as qty, pu.purchase_rate as rate,
          0 as debit, pu.purchase_amount as credit, 'purchase' as entry_type, pu.id
        FROM purchases pu
        LEFT JOIN cement_brands cb ON pu.brand_id = cb.id
        WHERE pu.supplier_id = $1
      `, [party.id]);

      // Payments = debit (we paid them)
      const payments = await getAll(`
        SELECT p.date,
          ('Payment - ' || COALESCE(p.mode, 'bank') || CASE WHEN p.bank_name IS NOT NULL THEN ' (' || p.bank_name || ')' ELSE '' END) as particulars,
          0 as qty, 0 as rate, p.amount as debit, 0 as credit, 'payment' as entry_type, p.id
        FROM payments p WHERE p.party_id = $1
      `, [party.id]);

      entries = [...purchases, ...payments];
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

    // For suppliers: opening_balance = advance already paid by us → starts as negative (they owe us)
    // For non-suppliers: opening_balance = what they already owe us → starts as positive
    let balance = isSupplier ? -(party.opening_balance || 0) : (party.opening_balance || 0);
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
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
