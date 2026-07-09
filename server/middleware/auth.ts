import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { getAll } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'cementbook-dev-secret';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; username: string; role: string };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number; username: string; role: string };
    req.user = { id: payload.userId, username: payload.username, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Short-lived per-user permission cache: saves a DB round-trip on every
// permission-gated request. Invalidated when an admin edits permissions;
// the TTL bounds staleness if that signal is ever missed.
const PERM_CACHE_TTL_MS = 60_000;
const permCache = new Map<number, { perms: Set<string>; at: number }>();

export function invalidatePermissionCache(userId?: number) {
  if (userId != null) permCache.delete(userId);
  else permCache.clear();
}

async function getUserPermissions(userId: number): Promise<Set<string>> {
  const hit = permCache.get(userId);
  if (hit && Date.now() - hit.at < PERM_CACHE_TTL_MS) return hit.perms;
  const rows = await getAll('SELECT permission_name FROM user_permissions WHERE user_id = $1', [userId]);
  const perms = new Set<string>(rows.map((r: any) => r.permission_name));
  permCache.set(userId, { perms, at: Date.now() });
  return perms;
}

export function requirePermission(permissionName: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
    if (req.user.role === 'admin') { next(); return; }
    const perms = await getUserPermissions(req.user.id);
    if (perms.has(permissionName)) { next(); return; }
    res.status(403).json({ error: 'Permission denied' });
  };
}

export { JWT_SECRET };
