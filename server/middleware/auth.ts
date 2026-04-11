import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getOne } from '../db/database';

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

export function requirePermission(permissionName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === 'admin') return next();
    const row = await getOne(
      'SELECT 1 FROM user_permissions WHERE user_id = $1 AND permission_name = $2',
      [req.user.id, permissionName]
    );
    if (row) return next();
    return res.status(403).json({ error: 'Permission denied' });
  };
}

export { JWT_SECRET };
