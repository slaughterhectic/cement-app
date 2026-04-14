import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';

const router = Router();

// GET / — list all dealers with stats
router.get('/', async (_req, res) => {
  try {
    const dealers = await getAll(`
      SELECT p.*,
        COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0) as total_sales,
        COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id), 0) as total_paid,
        COALESCE(p.opening_balance, 0)
          + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id = p.id), 0)
          - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id = p.id), 0) as outstanding,
        (SELECT COUNT(*) FROM parties sp WHERE sp.parent_id = p.id) as sub_party_count
      FROM parties p WHERE p.type = 'dealer' ORDER BY p.name
    `);
    res.json(dealers);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST / — create a new dealer
router.post('/', async (req, res) => {
  const { name, phone, location, district, opening_balance } = req.body;
  try {
    const result = await getOne(
      'INSERT INTO parties (name, phone, location, district, type, opening_balance) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, phone || null, location || null, district || null, 'dealer', opening_balance || 0]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// PUT /:id — update dealer
router.put('/:id', async (req, res) => {
  const { name, phone, location, district, opening_balance } = req.body;
  try {
    const result = await getOne(
      'UPDATE parties SET name=$1, phone=$2, location=$3, district=$4, opening_balance=$5 WHERE id=$6 AND type=\'dealer\' RETURNING *',
      [name, phone || null, location || null, district || null, opening_balance || 0, req.params.id]
    );
    if (!result) return res.status(404).json({ error: 'Dealer not found' });
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /:id — delete a dealer (only if no transactions)
router.delete('/:id', async (req, res) => {
  try {
    const used = await getOne(
      `SELECT 1 FROM (
        SELECT party_id as pid FROM sales WHERE party_id=$1
        UNION ALL SELECT party_id FROM payments WHERE party_id=$1
        UNION ALL SELECT id FROM parties WHERE parent_id=$1 LIMIT 1
      ) t LIMIT 1`,
      [req.params.id]
    );
    if (used) return res.status(400).json({ error: 'Cannot delete: dealer has existing transactions or sub-parties.' });
    await query('DELETE FROM parties WHERE id=$1 AND type=\'dealer\'', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /:id/sub-parties — list sub-parties for this dealer
router.get('/:id/sub-parties', async (req, res) => {
  try {
    const subParties = await getAll(
      'SELECT * FROM parties WHERE parent_id = $1 ORDER BY name',
      [req.params.id]
    );
    res.json(subParties);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id/sub-parties/:subId — remove a sub-party
router.delete('/:id/sub-parties/:subId', async (req, res) => {
  try {
    const sub = await getOne('SELECT id FROM parties WHERE id=$1 AND parent_id=$2', [req.params.subId, req.params.id]);
    if (!sub) return res.status(404).json({ error: 'Sub-party not found under this dealer' });
    const used = await getOne(
      `SELECT 1 FROM (
        SELECT party_id FROM sales WHERE party_id=$1
        UNION ALL SELECT party_id FROM payments WHERE party_id=$1
      ) t LIMIT 1`,
      [req.params.subId]
    );
    if (used) return res.status(400).json({ error: 'Cannot delete: sub-party has existing transactions.' });
    await query('DELETE FROM parties WHERE id=$1', [req.params.subId]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /:id/sub-parties — add a sub-party under this dealer
router.post('/:id/sub-parties', async (req, res) => {
  const { name, phone, location, district, type, opening_balance } = req.body;
  const dealerId = req.params.id;
  try {
    const dealer = await getOne('SELECT id FROM parties WHERE id=$1 AND type=\'dealer\'', [dealerId]);
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
    const result = await getOne(
      'INSERT INTO parties (name, phone, location, district, type, opening_balance, parent_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, phone || null, location || null, district || null, type || 'other', opening_balance || 0, dealerId]
    );
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// GET /:id/ledger — aggregated ledger for dealer
router.get('/:id/ledger', async (req, res) => {
  try {
    const dealer = await getOne('SELECT * FROM parties WHERE id=$1 AND type=\'dealer\'', [req.params.id]);
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    // Sales = debit (dealer owes us)
    const sales = await getAll(`
      SELECT s.date, cb.name as particulars, s.bags as qty, s.sale_rate as rate,
        s.sale_amount as debit, 0 as credit, 'sale' as entry_type, s.id
      FROM sales s JOIN cement_brands cb ON s.brand_id = cb.id
      WHERE s.party_id = $1
    `, [dealer.id]);

    // Payments = credit (dealer paid us)
    const payments = await getAll(`
      SELECT p.date,
        ('Payment - ' || COALESCE(p.mode, 'bank') || CASE WHEN p.bank_name IS NOT NULL THEN ' (' || p.bank_name || ')' ELSE '' END) as particulars,
        0 as qty, 0 as rate, 0 as debit, p.amount as credit, 'payment' as entry_type, p.id
      FROM payments p WHERE p.party_id = $1
    `, [dealer.id]);

    const entries = [...sales, ...payments];

    const ledger = entries.sort((a: any, b: any) => {
      if (a.date === b.date) {
        if (a.entry_type === 'payment') return 1;
        if (b.entry_type === 'payment') return -1;
        return 0;
      }
      return a.date.localeCompare(b.date);
    });

    let balance = dealer.opening_balance || 0;
    const ledgerWithBalance = ledger.map((entry: any, idx: number) => {
      // debit increases balance (dealer owes more), credit decreases (they paid)
      balance = balance + Number(entry.debit || 0) - Number(entry.credit || 0);
      return { ...entry, sno: idx + 1, balance };
    });

    res.json({ party: dealer, opening_balance: dealer.opening_balance || 0, ledger: ledgerWithBalance });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
