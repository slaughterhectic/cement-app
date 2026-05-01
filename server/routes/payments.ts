import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { friendlyError } from '../lib/userError';
import { requirePermission } from '../middleware/auth';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';

const router = Router();

async function getOutstanding(partyId: number): Promise<number> {
  const party = await getOne('SELECT type, opening_balance FROM parties WHERE id=$1', [partyId]);
  if (!party) return 0;
  if (party.type === 'supplier') {
    // opening_balance = advance already paid by us, so it REDUCES what we owe them
    const r = await getOne(`
      SELECT COALESCE((SELECT SUM(purchase_amount) FROM purchases WHERE supplier_id=$1), 0)
           - COALESCE($2::real, 0)
           - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=$1), 0) as outstanding
    `, [partyId, party.opening_balance || 0]);
    return Number(r.outstanding);
  }
  // Non-supplier: direction='pay' (we paid them) adds to outstanding; direction='receive' reduces it
  const r = await getOne(`
    SELECT COALESCE($2::real, 0)
         + COALESCE((SELECT SUM(sale_amount) FROM sales WHERE party_id=$1), 0)
         + COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=$1 AND direction='pay'), 0)
         - COALESCE((SELECT SUM(amount) FROM payments WHERE party_id=$1 AND (direction='receive' OR direction IS NULL)), 0) as outstanding
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
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.get('/parties-with-dues', async (_req, res) => {
  try {
    // Return ALL parties with outstanding > 0 — both customers (receivable) and suppliers (payable)
    const parties = await getAll(`
      SELECT p.id, p.name, p.type,
        CASE
          WHEN p.type = 'supplier' THEN
            -- opening_balance = advance paid by us, so subtract it (reduces what we owe)
            COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id = p.id), 0)
            - COALESCE(p.opening_balance, 0)
            - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id = p.id), 0)
          ELSE
            COALESCE(p.opening_balance, 0)
            + COALESCE((SELECT SUM(s.sale_amount) FROM sales s WHERE s.party_id = p.id), 0)
            + COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id = p.id AND pm.direction = 'pay'), 0)
            - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id = p.id AND (pm.direction = 'receive' OR pm.direction IS NULL)), 0)
        END as outstanding
      FROM parties p
      WHERE (
        CASE
          WHEN p.type = 'supplier' THEN
            COALESCE((SELECT SUM(pu.purchase_amount) FROM purchases pu WHERE pu.supplier_id = p.id), 0)
            - COALESCE(p.opening_balance, 0)
            - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id = p.id), 0)
          ELSE
            COALESCE(p.opening_balance, 0)
            + COALESCE((SELECT SUM(s.sale_amount) FROM sales s WHERE s.party_id = p.id), 0)
            + COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id = p.id AND pm.direction = 'pay'), 0)
            - COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.party_id = p.id AND (pm.direction = 'receive' OR pm.direction IS NULL)), 0)
        END
      ) > 0
      ORDER BY p.name
    `);
    res.json(parties);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

router.post('/', async (req, res) => {
  const { date, party_id, amount, mode, bank_name, cash_handler, suspense_party_id, remarks, direction } = req.body;
  const dir = direction === 'pay' ? 'pay' : 'receive';
  try {
    // Non-admin users entering a past/future date need admin approval
    const today = new Date().toISOString().split('T')[0];
    if (req.user?.role !== 'admin' && date !== today) {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name)
         VALUES ('payment', $1::jsonb, $2, $3) RETURNING id`,
        [JSON.stringify(req.body), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    const normalizedMode = mode || 'cash';
    const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
    const bank    = normalizedMode === 'bank' ? (bank_name    || null) : null;
    // Suspense routing: only valid when mode='suspense', and the suspense party must exist + be type='suspense'
    const susId = normalizedMode === 'suspense' ? Number(suspense_party_id) || null : null;
    if (normalizedMode === 'suspense') {
      if (!susId) return res.status(400).json({ error: 'Pick a suspense party for via-suspense payments' });
      const sus = await getOne(`SELECT type FROM parties WHERE id=$1`, [susId]);
      if (!sus || sus.type !== 'suspense') return res.status(400).json({ error: 'Selected party is not a suspense party' });
      if (Number(susId) === Number(party_id)) return res.status(400).json({ error: 'Suspense and party must differ' });
    }

    const result = await getOne(
      `INSERT INTO payments (date, party_id, amount, mode, bank_name, cash_handler, suspense_party_id, remarks, direction)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [date, party_id, amount, normalizedMode, bank, handler, susId, remarks, dir]
    );

    const party = await getOne(`SELECT name FROM parties WHERE id=$1`, [party_id]);
    // Only sync to imprest when this payment moved cash through a handler. Suspense routing
    // and bank mode skip the cash book.
    await syncImprestForCashTxn({
      sourceTable: 'payments',
      sourceId: result.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      direction: dir === 'pay' ? 'debit' : 'credit',
      particulars: `${dir === 'pay' ? 'Payment to' : 'Receipt from'} ${party?.name ?? 'Party #' + party_id}`,
      narration: remarks || null,
    });

    const full = await getOne(
      'SELECT pm.*, p.name as party_name FROM payments pm JOIN parties p ON pm.party_id=p.id WHERE pm.id=$1',
      [result.id]
    );
    res.json(full);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

router.delete('/:id', requirePermission('delete_payments'), async (req, res) => {
  try {
    await deleteImprestForSource('payments', Number(req.params.id));
    await query('DELETE FROM payments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
