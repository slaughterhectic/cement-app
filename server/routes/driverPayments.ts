import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';
import { friendlyError } from '../lib/userError';
import { syncImprestForCashTxn, deleteImprestForSource } from '../lib/imprestSync';

const router = Router();

// GET /driver-payments
router.get('/', async (req, res) => {
  try {
    const { driver_id } = req.query;
    let sql = `
      SELECT dp.*, d.name as driver_name, tt.date as trip_date
      FROM driver_payments dp
      JOIN drivers d ON dp.driver_id = d.id
      LEFT JOIN truck_trips tt ON dp.trip_id = tt.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (driver_id) { sql += ` AND dp.driver_id = $${idx++}`; params.push(driver_id); }

    sql += ' ORDER BY dp.date DESC, dp.id DESC';
    res.json(await getAll(sql, params));
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /driver-payments
router.post('/', async (req, res) => {
  try {
    const { date, driver_id, amount, mode, bank_name, cash_handler, trip_id, remarks } = req.body;
    if (!date || !driver_id || !amount) return res.status(400).json({ error: 'date, driver_id and amount are required' });

    // Non-admin past/future-date entries route through the TruckBook approval queue
    const today = new Date().toISOString().split('T')[0];
    if (req.user?.role !== 'admin' && date !== today) {
      const user = await getOne('SELECT display_name FROM users WHERE id=$1', [req.user!.id]);
      const pending = await getOne(
        `INSERT INTO pending_entries (entry_type, entry_data, created_by, created_by_name, source)
         VALUES ('driver_payment', $1::jsonb, $2, $3, 'truckbook') RETURNING id`,
        [JSON.stringify(req.body), req.user!.id, user?.display_name || req.user!.username]
      );
      return res.status(202).json({ pending: true, pending_id: pending.id, message: 'Entry sent for admin approval' });
    }

    const normalizedMode = mode || 'cash';
    const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
    const bank    = normalizedMode === 'bank' ? (bank_name    || null) : null;

    const row = await getOne(
      `INSERT INTO driver_payments (date, driver_id, amount, mode, bank_name, cash_handler, trip_id, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [date, driver_id, amount, normalizedMode, bank, handler, trip_id || null, remarks || null]
    );

    const driver = await getOne(`SELECT name FROM drivers WHERE id=$1`, [driver_id]);
    await syncImprestForCashTxn({
      sourceTable: 'driver_payments',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      particulars: `Driver payment — ${driver?.name ?? 'Driver #' + driver_id}`,
      narration: remarks || null,
    });

    const full = await getOne(
      `SELECT dp.*, d.name as driver_name FROM driver_payments dp JOIN drivers d ON dp.driver_id=d.id WHERE dp.id=$1`,
      [row.id]
    );
    res.json(full);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// PUT /driver-payments/:id
router.put('/:id', async (req, res) => {
  try {
    const { date, driver_id, amount, mode, bank_name, cash_handler, trip_id, remarks } = req.body;
    if (!date || !driver_id || !amount) return res.status(400).json({ error: 'date, driver_id and amount are required' });

    const normalizedMode = mode || 'cash';
    const handler = normalizedMode === 'cash' ? (cash_handler || null) : null;
    const bank    = normalizedMode === 'bank' ? (bank_name    || null) : null;

    const row = await getOne(
      `UPDATE driver_payments
          SET date=$1, driver_id=$2, amount=$3, mode=$4, bank_name=$5,
              cash_handler=$6, trip_id=$7, remarks=$8
        WHERE id=$9 RETURNING *`,
      [date, driver_id, amount, normalizedMode, bank, handler, trip_id || null, remarks || null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Driver payment not found' });

    const driver = await getOne(`SELECT name FROM drivers WHERE id=$1`, [driver_id]);
    await syncImprestForCashTxn({
      sourceTable: 'driver_payments',
      sourceId: row.id,
      mode: normalizedMode,
      cashHandler: handler,
      amount: Number(amount),
      date,
      particulars: `Driver payment — ${driver?.name ?? 'Driver #' + driver_id}`,
      narration: remarks || null,
    });

    const full = await getOne(
      `SELECT dp.*, d.name as driver_name FROM driver_payments dp JOIN drivers d ON dp.driver_id=d.id WHERE dp.id=$1`,
      [row.id]
    );
    res.json(full);
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

// DELETE /driver-payments/:id (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await deleteImprestForSource('driver_payments', Number(req.params.id));
    await query('DELETE FROM driver_payments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: friendlyError(e) }); }
});

export default router;
