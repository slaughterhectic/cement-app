import { Router } from 'express';
import { getAll, getOne, query } from '../db/database';
import { friendlyError } from '../lib/userError';

const router = Router();

// GET /api/requests — admin sees all, user sees own; ?source= filters by book
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const source = req.query.source as string | undefined;
    const params: any[] = [];
    let where = '';

    if (isAdmin) {
      if (source) { where = 'WHERE r.source = $1'; params.push(source); }
    } else {
      params.push(req.user!.id);
      where = `WHERE r.created_by = $1${source ? ` AND r.source = $2` : ''}`;
      if (source) params.push(source);
    }

    const rows = await getAll(
      `SELECT r.*, u.display_name as created_by_name,
              cu.display_name as completed_by_name
       FROM requests r
       JOIN users u ON r.created_by = u.id
       LEFT JOIN users cu ON r.completed_by = cu.id
       ${where}
       ORDER BY r.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// POST /api/requests — any authenticated user
router.post('/', async (req, res) => {
  try {
    const { title, message, source } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
    const src = source === 'truckbook' ? 'truckbook' : 'cementbook';
    const row = await getOne(
      `INSERT INTO requests (title, message, created_by, source)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title.trim(), message?.trim() || null, req.user!.id, src]
    );
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// PATCH /api/requests/:id/complete — admin only
router.patch('/:id/complete', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { admin_note } = req.body;
    const row = await getOne(
      `UPDATE requests
       SET status = 'completed', completed_by = $1, completed_at = NOW(), admin_note = $2
       WHERE id = $3 RETURNING *`,
      [req.user.id, admin_note?.trim() || null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Request not found' });
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// PATCH /api/requests/:id/reopen — admin only
router.patch('/:id/reopen', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const row = await getOne(
      `UPDATE requests
       SET status = 'pending', completed_by = NULL, completed_at = NULL, admin_note = NULL
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Request not found' });
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

// DELETE /api/requests/:id — admin only
router.delete('/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await query('DELETE FROM requests WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: friendlyError(e) }); }
});

export default router;
