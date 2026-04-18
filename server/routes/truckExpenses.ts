import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';

const router = Router();

// GET /truck-expenses
router.get('/', async (req, res) => {
  try {
    const { truck_id } = req.query;
    let sql = `
      SELECT te.*, t.truck_number
      FROM truck_expenses te
      LEFT JOIN trucks t ON te.truck_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (truck_id) { sql += ` AND te.truck_id = $${idx++}`; params.push(truck_id); }

    sql += ' ORDER BY te.date DESC, te.id DESC';
    res.json(await getAll(sql, params));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /truck-expenses
router.post('/', async (req, res) => {
  try {
    const { date, truck_id, category, description, amount, mode, bank_name, cash_handler } = req.body;
    if (!date || !amount) return res.status(400).json({ error: 'date and amount are required' });

    const normalizedMode = mode || 'cash';
    const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
    const bank    = normalizedMode === 'bank' ? (bank_name    || null) : null;

    const row = await getOne(
      `INSERT INTO truck_expenses (date, truck_id, category, description, amount, mode, bank_name, cash_handler)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [date, truck_id || null, category || null, description || null, amount, normalizedMode, bank, handler]
    );

    const truck = truck_id ? await getOne(`SELECT truck_number FROM trucks WHERE id=$1`, [truck_id]) : null;
    await syncImprestForCashTxn({
      sourceTable: 'truck_expenses',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      particulars: `Truck expense — ${category || 'General'}${truck?.truck_number ? ' (' + truck.truck_number + ')' : ''}`,
      narration: description || null,
    });

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// PUT /truck-expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const { date, truck_id, category, description, amount, mode, bank_name, cash_handler } = req.body;
    if (!date || !amount) return res.status(400).json({ error: 'date and amount are required' });

    const normalizedMode = mode || 'cash';
    const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
    const bank    = normalizedMode === 'bank' ? (bank_name    || null) : null;

    const row = await getOne(
      `UPDATE truck_expenses
          SET date=$1, truck_id=$2, category=$3, description=$4, amount=$5,
              mode=$6, bank_name=$7, cash_handler=$8
        WHERE id=$9 RETURNING *`,
      [date, truck_id || null, category || null, description || null, amount, normalizedMode, bank, handler, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Truck expense not found' });

    const truck = truck_id ? await getOne(`SELECT truck_number FROM trucks WHERE id=$1`, [truck_id]) : null;
    await syncImprestForCashTxn({
      sourceTable: 'truck_expenses',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      particulars: `Truck expense — ${category || 'General'}${truck?.truck_number ? ' (' + truck.truck_number + ')' : ''}`,
      narration: description || null,
    });

    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /truck-expenses/:id (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await deleteImprestForSource('truck_expenses', Number(req.params.id));
    await query('DELETE FROM truck_expenses WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
