import { Router } from 'express';
import { query, getOne, getAll } from '../db/database';

const router = Router();

async function getStock(brandId: number, godownId?: number): Promise<number> {
  if (godownId) {
    const r = await getOne(`
      SELECT COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id=$1 AND godown_id=$2),0)
           - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id=$1 AND godown_id=$2),0) as stock
    `, [brandId, godownId]);
    return Number(r.stock);
  }
  const r = await getOne(`
    SELECT COALESCE((SELECT SUM(bags) FROM purchases WHERE brand_id=$1),0)
         - COALESCE((SELECT SUM(bags) FROM sales WHERE brand_id=$1),0) as stock
  `, [brandId]);
  return Number(r.stock);
}

// GET /api/pending-entries
// Admin: all entries; User: own entries only
router.get('/', async (req, res) => {
  try {
    let rows: any[];
    if (req.user!.role === 'admin') {
      rows = await getAll(`
        SELECT pe.*, u.display_name as created_by_name, rv.display_name as reviewed_by_name
        FROM pending_entries pe
        LEFT JOIN users u ON pe.created_by = u.id
        LEFT JOIN users rv ON pe.reviewed_by = rv.id
        ORDER BY
          CASE pe.status WHEN 'pending' THEN 0 ELSE 1 END,
          pe.created_at DESC
      `);
    } else {
      rows = await getAll(`
        SELECT pe.*, u.display_name as created_by_name, rv.display_name as reviewed_by_name
        FROM pending_entries pe
        LEFT JOIN users u ON pe.created_by = u.id
        LEFT JOIN users rv ON pe.reviewed_by = rv.id
        WHERE pe.created_by = $1
        ORDER BY
          CASE pe.status WHEN 'pending' THEN 0 ELSE 1 END,
          pe.created_at DESC
      `, [req.user!.id]);
    }

    // Enrich entry_data with display names
    for (const pe of rows) {
      const data = pe.entry_data || {};
      try {
        if (pe.entry_type === 'sale') {
          const party = data.party_id ? await getOne('SELECT name FROM parties WHERE id=$1', [data.party_id]) : null;
          const brand = data.brand_id ? await getOne('SELECT name FROM cement_brands WHERE id=$1', [data.brand_id]) : null;
          pe.entry_data = { ...data, party_name: party?.name ?? null, brand_name: brand?.name ?? null };
        } else if (pe.entry_type === 'purchase') {
          const brand = data.brand_id ? await getOne('SELECT name FROM cement_brands WHERE id=$1', [data.brand_id]) : null;
          const party = data.supplier_id ? await getOne('SELECT name FROM parties WHERE id=$1', [data.supplier_id]) : null;
          pe.entry_data = { ...data, brand_name: brand?.name ?? null, supplier_name: party?.name ?? data.supplier_name ?? null };
        } else if (pe.entry_type === 'payment') {
          const party = data.party_id ? await getOne('SELECT name FROM parties WHERE id=$1', [data.party_id]) : null;
          pe.entry_data = { ...data, party_name: party?.name ?? null };
        }
      } catch (_) { /* leave as-is if lookup fails */ }
    }

    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/pending-entries/count — fast badge count
router.get('/count', async (req, res) => {
  try {
    let r: any;
    if (req.user!.role === 'admin') {
      r = await getOne(`SELECT COUNT(*) as count FROM pending_entries WHERE status='pending'`);
    } else {
      r = await getOne(`SELECT COUNT(*) as count FROM pending_entries WHERE status='pending' AND created_by=$1`, [req.user!.id]);
    }
    res.json({ count: Number(r.count) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/pending-entries/:id/approve (admin only)
router.post('/:id/approve', async (req, res) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const pending = await getOne(
      `SELECT * FROM pending_entries WHERE id=$1 AND status='pending'`,
      [req.params.id]
    );
    if (!pending) return res.status(404).json({ error: 'Pending entry not found or already processed' });

    const data = pending.entry_data;
    let result: any;

    if (pending.entry_type === 'sale') {
      const stock = await getStock(data.brand_id, data.godown_id || undefined);
      if (data.bags > stock) {
        return res.status(400).json({ error: `Insufficient stock: only ${stock} bags available. Cannot approve.` });
      }
      result = await getOne(
        `INSERT INTO sales (date, party_id, brand_id, cement_type, bags, sale_rate, cost_rate, destination, invoice_number, billed_party, billed_quantity, billed_rate, billed_amount, truck_number, godown_id, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [
          data.date, data.party_id, data.brand_id, data.cement_type, data.bags, data.sale_rate,
          data.cost_rate || 0, data.destination, data.invoice_number, data.billed_party,
          data.billed_quantity || null, data.billed_rate || null, data.billed_amount || null,
          data.truck_number, data.godown_id || null, data.remarks,
        ]
      );
    } else if (pending.entry_type === 'purchase') {
      const party = data.supplier_id ? await getOne('SELECT name FROM parties WHERE id=$1', [data.supplier_id]) : null;
      const supplier_name = party?.name ?? data.supplier_name ?? '';
      result = await getOne(
        `INSERT INTO purchases (date, supplier_name, supplier_id, brand_id, cement_type, bags, purchase_rate, freight_rate, godown_id, truck_number, source_location, invoice_number, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          data.date, supplier_name, data.supplier_id || null, data.brand_id, data.cement_type,
          data.bags, data.purchase_rate, data.freight_rate || 0, data.godown_id || null,
          data.truck_number, data.source_location, data.invoice_number || null, data.remarks,
        ]
      );
    } else if (pending.entry_type === 'payment') {
      const dir = data.direction === 'pay' ? 'pay' : 'receive';
      result = await getOne(
        `INSERT INTO payments (date, party_id, amount, mode, bank_name, remarks, direction)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [data.date, data.party_id, data.amount, data.mode, data.bank_name, data.remarks, dir]
      );
    } else if (pending.entry_type === 'expense') {
      result = await getOne(
        `INSERT INTO expenses (date, amount, category, description, bank_name, mode)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [data.date, data.amount, data.category, data.description, data.bank_name, data.mode]
      );
    } else {
      return res.status(400).json({ error: 'Unknown entry type' });
    }

    await query(
      `UPDATE pending_entries SET status='approved', reviewed_by=$1, reviewed_at=NOW(), admin_note=$2 WHERE id=$3`,
      [req.user!.id, req.body.admin_note || null, pending.id]
    );

    res.json({ approved: true, entry: result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/pending-entries/:id/reject (admin only)
router.post('/:id/reject', async (req, res) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const pending = await getOne(
      `SELECT id FROM pending_entries WHERE id=$1 AND status='pending'`,
      [req.params.id]
    );
    if (!pending) return res.status(404).json({ error: 'Pending entry not found or already processed' });

    await query(
      `UPDATE pending_entries SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), admin_note=$2 WHERE id=$3`,
      [req.user!.id, req.body.admin_note || null, req.params.id]
    );

    res.json({ rejected: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/pending-entries/:id
// Users can only delete their own pending entries; admin can delete any
router.delete('/:id', async (req, res) => {
  try {
    let row: any;
    if (req.user!.role === 'admin') {
      row = await getOne('SELECT id FROM pending_entries WHERE id=$1', [req.params.id]);
    } else {
      row = await getOne(
        `SELECT id FROM pending_entries WHERE id=$1 AND created_by=$2 AND status='pending'`,
        [req.params.id, req.user!.id]
      );
    }
    if (!row) return res.status(404).json({ error: 'Not found or not allowed' });

    await query('DELETE FROM pending_entries WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
