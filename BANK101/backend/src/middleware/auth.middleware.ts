import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { jwtSecret } from '../config/env';
import { query } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    account_type: string;
  };
}

/** SHA-256 hash of a token — stored in the DB, never the raw value. */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Short-lived access token (15 minutes). */
export function signAccessToken(user: { id: number; username: string; account_type: string }): string {
  return jwt.sign(
    { id: user.id, username: user.username, account_type: user.account_type },
    jwtSecret(),
    { expiresIn: '15m' }
  );
}

/** Long-lived refresh token marker (not a JWT — a random opaque hex string stored hashed). */
export function signRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * signToken is kept for backwards compatibility with existing tests.
 * New code should use signAccessToken instead.
 */
export function signToken(user: { id: number; username: string; account_type: string }): string {
  return signAccessToken(user);
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Access Token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtSecret()) as {
      id: number;
      username: string;
      account_type: string;
    };
    req.user = { id: decoded.id, username: decoded.username, account_type: decoded.account_type };
    next();
  } catch (err: any) {
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid or expired token' });
  }
}

/**
 * requireAdmin — reads account_type from DB (not token) so revoked admins are rejected.
 * For new code prefer requireRole('admin') from rbac.middleware.ts.
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const r = await query('SELECT account_type FROM users WHERE id = $1', [req.user?.id]);
    if (r.rows.length === 0 || r.rows[0].account_type !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: administrator access required' });
    }
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** Current tier from the database (the token can be up to 15 min stale). */
export async function currentTier(userId: number): Promise<string> {
  const r = await query('SELECT account_type FROM users WHERE id = $1', [userId]);
  return r.rows[0]?.account_type || 'Free';
}
