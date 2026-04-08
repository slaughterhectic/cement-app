import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const parties = await getAll(`
      SELECT p.*,
        COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0) as total_sales,
        COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id), 0) as total_paid,
        (COALESCE(p.opening_balance, 0)
         + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id), 0)) as outstanding,
        (SELECT MAX(d) FROM (
          SELECT date as d FROM sales WHERE party_id = p.id
          UNION ALL SELECT date FROM payments WHERE party_id = p.id
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

router.get('/:id/summary', async (req, res) => {
  try {
    const party = await getOne('SELECT * FROM parties WHERE id=$1', [req.params.id]);
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const totals = await getOne(`
      SELECT
        COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=$1), 0) as total_sales,
        COALESCE((SELECT SUM(bags) FROM sales WHERE party_id=$1), 0) as total_bags,
        COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=$1), 0) as total_paid
    `, [party.id]);

    res.json({
      ...party,
      total_sales: Number(totals.total_sales),
      total_bags: Number(totals.total_bags),
      total_paid: Number(totals.total_paid),
      outstanding: (party.opening_balance || 0) + Number(totals.total_sales) - Number(totals.total_paid),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/ledger', async (req, res) => {
  try {
    const party = await getOne('SELECT * FROM parties WHERE id=$1', [req.params.id]);
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const sales = await getAll(`
      SELECT s.date, cb.name as particulars, s.bags as qty, s.sale_rate as rate,
        s.sale_amount as debit, 0 as credit, 'sale' as entry_type, s.id
      FROM sales s JOIN cement_brands cb ON s.brand_id = cb.id
      WHERE s.party_id = $1
    `, [party.id]);

    const payments = await getAll(`
      SELECT p.date,
        ('Payment - ' || COALESCE(p.mode, 'bank') || CASE WHEN p.bank_name IS NOT NULL THEN ' (' || p.bank_name || ')' ELSE '' END) as particulars,
        0 as qty, 0 as rate, 0 as debit, p.amount as credit, 'payment' as entry_type, p.id
      FROM payments p WHERE p.party_id = $1
    `, [party.id]);

    const ledger = [...sales, ...payments].sort((a: any, b: any) => {
      if (a.date === b.date) return a.entry_type === 'sale' ? -1 : 1;
      return a.date.localeCompare(b.date);
    });

    let balance = party.opening_balance || 0;
    const ledgerWithBalance = ledger.map((entry: any, idx: number) => {
      balance = balance + Number(entry.debit || 0) - Number(entry.credit || 0);
      return { ...entry, sno: idx + 1, balance };
    });

    res.json({ party, opening_balance: party.opening_balance || 0, ledger: ledgerWithBalance });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
