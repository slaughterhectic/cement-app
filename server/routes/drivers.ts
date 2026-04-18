import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';

const router = Router();

// GET /drivers — list with payment totals and trip count
router.get('/', async (_req, res) => {
  try {
    const rows = await getAll(`
      SELECT
        d.*,
        COUNT(DISTINCT tt.id) as trip_count,
        COALESCE(SUM(tt.driver_payment), 0) as total_earned,
        COALESCE((SELECT SUM(dp.amount) FROM driver_payments dp WHERE dp.driver_id = d.id), 0) as total_paid,
        COALESCE(SUM(tt.driver_payment), 0) - COALESCE((SELECT SUM(dp.amount) FROM driver_payments dp WHERE dp.driver_id = d.id), 0) as outstanding
      FROM drivers d
      LEFT JOIN truck_trips tt ON tt.driver_id = d.id
      GROUP BY d.id
      ORDER BY d.name
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /drivers/:id/ledger
router.get('/:id/ledger', async (req, res) => {
  try {
    const driver = await getOne('SELECT * FROM drivers WHERE id=$1', [req.params.id]);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    // All trips for this driver (earning entries)
    const trips = await getAll(`
      SELECT
        tt.id,
        tt.date,
        'trip' as entry_type,
        tt.driver_payment as amount,
        t.truck_number,
        tt.load_from,
        tt.billed_destination,
        tt.material_name,
        NULL as mode,
        NULL as bank_name,
        NULL as cash_handler,
        tt.remarks
      FROM truck_trips tt
      JOIN trucks t ON tt.truck_id = t.id
      WHERE tt.driver_id = $1 AND tt.driver_payment > 0
    `, [req.params.id]);

    // All payment entries for this driver
    const payments = await getAll(`
      SELECT
        dp.id,
        dp.date,
        'payment' as entry_type,
        dp.amount,
        NULL as truck_number,
        NULL as load_from,
        NULL as billed_destination,
        NULL as material_name,
        dp.mode,
        dp.bank_name,
        dp.cash_handler,
        dp.remarks
      FROM driver_payments dp
      WHERE dp.driver_id = $1
    `, [req.params.id]);

    // Merge and sort by date
    const allEntries = [...trips, ...payments].sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return 0;
    });

    // Compute running balance (positive = driver is owed money)
    let balance = 0;
    const ledger = allEntries.map((entry) => {
      if (entry.entry_type === 'trip') {
        balance += Number(entry.amount);
      } else {
        balance -= Number(entry.amount);
      }
      return { ...entry, balance };
    });

    const totalEarned = trips.reduce((s, t) => s + Number(t.amount), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

    res.json({
      driver,
      ledger,
      totalEarned,
      totalPaid,
      outstanding: totalEarned - totalPaid,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /drivers
router.post('/', async (req, res) => {
  try {
    const { name, phone, license_number } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const row = await getOne(
      `INSERT INTO drivers (name, phone, license_number) VALUES ($1,$2,$3) RETURNING *`,
      [name.trim(), phone || null, license_number || null]
    );
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// PUT /drivers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, license_number, is_active } = req.body;
    const row = await getOne(
      `UPDATE drivers SET name=$1, phone=$2, license_number=$3, is_active=$4 WHERE id=$5 RETURNING *`,
      [name, phone || null, license_number || null, is_active ?? 1, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Driver not found' });
    res.json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// DELETE /drivers/:id
router.delete('/:id', async (req, res) => {
  try {
    const usedTrip = await getOne('SELECT 1 FROM truck_trips WHERE driver_id=$1 LIMIT 1', [req.params.id]);
    if (usedTrip) return res.status(400).json({ error: 'Cannot delete driver with existing trips' });
    const usedPay = await getOne('SELECT 1 FROM driver_payments WHERE driver_id=$1 LIMIT 1', [req.params.id]);
    if (usedPay) return res.status(400).json({ error: 'Cannot delete driver with existing payments' });
    await query('DELETE FROM drivers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
