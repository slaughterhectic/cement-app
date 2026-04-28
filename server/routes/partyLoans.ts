import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';

const router = Router();

// GET /api/party-loans
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT pl.*, p.name as party_name
      FROM party_loans pl
      JOIN parties p ON pl.party_id = p.id
      ORDER BY pl.date DESC, pl.id DESC
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/party-loans
router.post('/', async (req: any, res) => {
  const { date, party_id, amount, mode, bank_name, cash_handler, type, remarks } = req.body;
  if (!date || !party_id || !amount || !type) {
    return res.status(400).json({ error: 'date, party_id, amount, type are required' });
  }
  const normalizedMode = mode === 'cash' ? 'cash' : 'bank';
  const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
  const bank = normalizedMode === 'bank' ? (bank_name || null) : null;
  try {
    const row = await getOne(
      `INSERT INTO party_loans (date, party_id, amount, mode, bank_name, cash_handler, type, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [date, party_id, amount, normalizedMode, bank, handler, type, remarks || null]
    );

    // Disbursement = cash leaves handler (debit). Repayment = cash enters handler (credit).
    await syncImprestForCashTxn({
      sourceTable: 'party_loans',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      particulars: `${type === 'disbursement' ? 'Loan disbursed' : 'Loan repayment'} — party #${party_id}`,
      narration: remarks || null,
      direction: type === 'disbursement' ? 'debit' : 'credit',
    });

    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /api/party-loans/:id — edit existing entry, re-sync imprest
router.put('/:id', async (req: any, res) => {
  const { date, party_id, amount, mode, bank_name, cash_handler, type, remarks } = req.body;
  if (!date || !party_id || !amount || !type) {
    return res.status(400).json({ error: 'date, party_id, amount, type are required' });
  }
  const normalizedMode = mode === 'cash' ? 'cash' : 'bank';
  const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
  const bank = normalizedMode === 'bank' ? (bank_name || null) : null;
  try {
    const row = await getOne(
      `UPDATE party_loans
         SET date=$1, party_id=$2, amount=$3, mode=$4, bank_name=$5, cash_handler=$6, type=$7, remarks=$8
       WHERE id=$9 RETURNING *`,
      [date, party_id, amount, normalizedMode, bank, handler, type, remarks || null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Entry not found' });

    // Re-sync imprest. The helper UPSERTS by (source_table, source_id) and removes
    // the row when mode flips to bank or handler is cleared.
    await syncImprestForCashTxn({
      sourceTable: 'party_loans',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      particulars: `${type === 'disbursement' ? 'Loan disbursed' : 'Loan repayment'} — party #${party_id}`,
      narration: remarks || null,
      direction: type === 'disbursement' ? 'debit' : 'credit',
    });

    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/party-loans/:id
router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await deleteImprestForSource('party_loans', Number(req.params.id));
    await query('DELETE FROM party_loans WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
