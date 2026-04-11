import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getOne, getAll, query } from '../db/database';
import { authMiddleware, JWT_SECRET } from '../middleware/auth';

const router = Router();

const ALL_PERMISSIONS = [
  'view_dashboard', 'view_capital', 'view_finance',
  'delete_purchases', 'delete_sales', 'delete_payments', 'delete_expenses',
  'delete_imprest', 'delete_capital_banks', 'delete_loans',
  'download',
];

// POST /api/auth/login — no auth required
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await getOne('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const perms = user.role === 'admin'
      ? ALL_PERMISSIONS
      : (await getAll('SELECT permission_name FROM user_permissions WHERE user_id = $1', [user.id]))
          .map((r: any) => r.permission_name);
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
      permissions: perms,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getOne('SELECT id, username, role, display_name FROM users WHERE id = $1', [req.user!.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const perms = user.role === 'admin'
      ? ALL_PERMISSIONS
      : (await getAll('SELECT permission_name FROM user_permissions WHERE user_id = $1', [user.id]))
          .map((r: any) => r.permission_name);
    res.json({ user, permissions: perms });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/users — admin only
router.get('/users', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const users = await getAll('SELECT id, username, role, display_name, created_at FROM users ORDER BY id');
    for (const u of users) {
      const perms = await getAll('SELECT permission_name FROM user_permissions WHERE user_id = $1', [u.id]);
      u.permissions = perms.map((r: any) => r.permission_name);
    }
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/users — admin create user
router.post('/users', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { username, password, display_name, role } = req.body;
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'username, password, display_name are required' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await getOne(
      'INSERT INTO users (username, password_hash, role, display_name) VALUES ($1, $2, $3, $4) RETURNING id, username, role, display_name, created_at',
      [username, hash, role || 'user', display_name]
    );
    res.json(result);
  } catch (e: any) {
    if (e.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/auth/users/:id — admin delete user
router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const id = parseInt(req.params.id);
    if (id === req.user!.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/auth/users/:id/permissions — admin update permissions
router.put('/users/:id/permissions', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const id = parseInt(req.params.id);
    const { permissions } = req.body as { permissions: string[] };
    await query('DELETE FROM user_permissions WHERE user_id = $1', [id]);
    for (const perm of permissions) {
      await query('INSERT INTO user_permissions (user_id, permission_name) VALUES ($1, $2)', [id, perm]);
    }
    res.json({ success: true, permissions });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
