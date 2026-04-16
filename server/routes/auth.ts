import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getOne, getAll, query } from '../db/database';
import { authMiddleware, JWT_SECRET } from '../middleware/auth';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../lib/mailer';

const router = Router();

const ALL_PERMISSIONS = [
  'access_cementbook', 'access_truckbook',
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
    const users = await getAll('SELECT id, username, role, display_name, email, created_at FROM users ORDER BY id');
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
    const { username, password, display_name, role, email } = req.body;
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'username, password, display_name are required' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await getOne(
      'INSERT INTO users (username, password_hash, role, display_name, email) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role, display_name, email, created_at',
      [username, hash, role || 'user', display_name, email || null]
    );
    res.json(result);
  } catch (e: any) {
    if (e.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/auth/users/:id/email — admin update user email
router.put('/users/:id/email', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { email } = req.body;
    await query('UPDATE users SET email=$1 WHERE id=$2', [email || null, req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
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

// POST /api/auth/users/:id/reset-password — admin resets a user's password directly
router.post('/users/:id/reset-password', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const user = await getOne('SELECT id, username, email, display_name FROM users WHERE id=$1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, user.id]);

    // Notify user by email if they have one
    if (user.email) {
      sendPasswordChangedEmail(user.email, user.display_name || user.username).catch(() => {});
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/forgot-password — request a reset link via email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });

    const user = await getOne('SELECT id, username, display_name, email FROM users WHERE LOWER(email)=LOWER($1)', [email.trim()]);

    // Always respond success to prevent email enumeration
    if (!user) return res.json({ success: true });

    // Invalidate previous tokens for this user
    await query('UPDATE password_reset_tokens SET used=TRUE WHERE user_id=$1 AND used=FALSE', [user.id]);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const appUrl = process.env.APP_URL || 'https://cement-app.vercel.app';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, user.display_name || user.username, resetLink);

    res.json({ success: true });
  } catch (e: any) {
    console.error('forgot-password error:', e.message);
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
});

// POST /api/auth/reset-password — consume token, set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) return res.status(400).json({ error: 'Token and new password are required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const record = await getOne(
      `SELECT prt.*, u.username, u.display_name, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token=$1 AND prt.used=FALSE AND prt.expires_at > NOW()`,
      [token]
    );

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, record.user_id]);
    await query('UPDATE password_reset_tokens SET used=TRUE WHERE id=$1', [record.id]);

    // Notify user
    if (record.email) {
      sendPasswordChangedEmail(record.email, record.display_name || record.username).catch(() => {});
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
