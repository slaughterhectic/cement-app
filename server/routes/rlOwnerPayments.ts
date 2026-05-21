import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';
import { canEditTransport } from '../lib/transportAuth';

const router = Router();

async function syncBankForPayment({
  sourceId, mode, bankName, amount, date, ownerName,
}: {
  sourceId: number; mode: string; bankName: string | null;
  amount: number; date: string; ownerName: string;
}) {
  await query(
    `DELETE FROM rl_bank_transactions WHERE source_table='rl_owner_payments' AND source_id=$1`,
    [sourceId]
  );
  if (mode === 'bank' && bankName) {
    const bank = await getOne('SELECT id FROM rl_banks WHERE name=$1', [bankName]);
    if (bank) {
      await query(
        `INSERT INTO rl_bank_transactions (bank_id, date, type, amount, particulars, source_table, source_id)
         VALUES ($1,$2,'debit',$3,$4,'rl_owner_payments',$5)`,
        [bank.id, date, amount, `Owner Payment — ${ownerName}`, sourceId]
      );
    }
  }
}

// GET /rl/owner-payments?owner_name=NAME
router.get('/', async (req, res) => {
  try {
    const ownerName = (req.query.owner_name as string | undefined)?.trim();
    const sql = ownerName
      ? `SELECT * FROM rl_owner_payments WHERE owner_name=$1 ORDER BY date DESC, id DESC`
      : `SELECT * FROM rl_owner_payments ORDER BY date DESC, id DESC`;
    const params = ownerName ? [ownerName] : [];
    const rows = await getAll(sql, params);
    res.json(rows.map((r: any) => ({ ...r, amount: Number(r.amount) })));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /rl/owner-payments
router.post('/', async (req, res) => {
  try {
    const { owner_name, date, amount, mode, bank_name, cash_handler, remarks } = req.body;
    if (!owner_name?.trim()) return res.status(400).json({ error: 'Owner name is required' });
    if (!date) return res.status(400).json({ error: 'Date is required' });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const owner = await getOne(
      `SELECT 1 FROM rl_truck_owners WHERE owner_name=$1 LIMIT 1`,
      [owner_name.trim()]
    );
    if (!owner) return res.status(400).json({ error: 'Owner not found' });

    if (!await canEditTransport(req)) {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name, source)
         VALUES ('rl_owner_payment', $1::jsonb, $2, $3, 'transportbook') RETURNING id`,
        [JSON.stringify(req.body), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    const row = await getOne(
      `INSERT INTO rl_owner_payments (owner_name, date, amount, mode, bank_name, cash_handler, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        owner_name.trim(), date, amt,
        mode || 'bank',
        bank_name?.trim() || null,
        cash_handler?.trim() || null,
        remarks?.trim() || null,
      ]
    );
    await syncBankForPayment({
      sourceId: row.id, mode: row.mode, bankName: row.bank_name,
      amount: amt, date, ownerName: owner_name.trim(),
    });
    res.json({ ...row, amount: Number(row.amount) });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /rl/owner-payments/:id
router.delete('/:id', async (req, res) => {
  try {
    await query(
      `DELETE FROM rl_bank_transactions WHERE source_table='rl_owner_payments' AND source_id=$1`,
      [req.params.id]
    );
    await query('DELETE FROM rl_owner_payments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
