import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { requirePermission } from '../middleware/auth';

const router = Router();

async function getOutstanding(partyId: number): Promise<number> {
  const party = await getOne('SELECT type, opening_balance FROM parties WHERE id=$1', [partyId]);
  if (!party) return 0;
  if (party.type === 'supplier') {
    const r = await getOne(`
      SELECT COALESCE($2::real, 0)
           + COALESCE((SELECT SUM(purchase_amount) FROM purchases WHERE supplier_id=$1), 0)
           - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=$1), 0) as outstanding
    `, [partyId, party.opening_balance || 0]);
    return Number(r.outstanding);
  }
  const r = await getOne(`
    SELECT COALESCE($2::real, 0)
         + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=$1), 0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=$1), 0) as outstanding
  `, [partyId, party.opening_balance || 0]);
  return Number(r.outstanding);
}

router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, party_id } = req.query;
    let sql = `SELECT pm.*, p.name as party_name, p.type as party_type FROM payments pm JOIN parties p ON pm.party_id = p.id WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (start_date) { sql += ` AND pm.date >= $${idx++}`; params.push(start_date); }
    if (end_date) { sql += ` AND pm.date <= $${idx++}`; params.push(end_date); }
    if (party_id) { sql += ` AND pm.party_id = $${idx++}`; params.push(party_id); }

    sql += ' ORDER BY pm.date DESC, pm.id DESC';
    res.json(await getAll(sql, params));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/parties-with-dues', async (_req, res) => {
  try {
    // Return ALL parties with outstanding > 0 — both customers (receivable) and suppliers (payable)
    const parties = await getAll(`
      SELECT p.id, p.name, p.type,
        CASE
          WHEN p.type = 'supplier' THEN
            COALESCE(p.opening_balance, 0)
            + COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id = p.id), 0)
            - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id = p.id), 0)
          ELSE
            COALESCE(p.opening_balance, 0)
            + COALESCE((SELECT SUM(s.sale_amount) FROM sales s WHERE s.party_id = p.id), 0)
            - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id = p.id), 0)
        END as outstanding
      FROM parties p
      WHERE (
        CASE
          WHEN p.type = 'supplier' THEN
            COALESCE(p.opening_balance, 0)
            + COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id = p.id), 0)
            - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id = p.id), 0)
          ELSE
            COALESCE(p.opening_balance, 0)
            + COALESCE((SELECT SUM(s.sale_amount) FROM sales s WHERE s.party_id = p.id), 0)
            - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id = p.id), 0)
        END
      ) > 0
      ORDER BY p.name
    `);
    res.json(parties);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { date, party_id, amount, mode, bank_name, remarks } = req.body;
  try {
    const result = await getOne(
      `INSERT INTO payments (date, party_id, amount, mode, bank_name, remarks) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [date, party_id, amount, mode, bank_name, remarks]
    );
    const full = await getOne(
      'SELECT pm.*, p.name as party_name FROM payments pm JOIN parties p ON pm.party_id=p.id WHERE pm.id=$1',
      [result.id]
    );
    res.json(full);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', requirePermission('delete_payments'), async (req, res) => {
  try {
    await query('DELETE FROM payments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
