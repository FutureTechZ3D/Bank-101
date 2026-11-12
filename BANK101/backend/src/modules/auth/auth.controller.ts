import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, withTransaction } from '../../config/db';
import { tierToggleEnabled } from '../../config/env';
import { signAccessToken, signRefreshToken, hashToken } from '../../middleware/auth.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { getUserRolesAndPermissions } from '../../middleware/rbac.middleware';

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,50}$/;
const PHONE_RE = /^[0-9+\-\s]{6,20}$/;
const REFRESH_TOKEN_TTL_DAYS = 7;

function publicUser(u: any) {
  return {
    id: u.id,
    username: u.username,
    phone: u.phone ?? null,
    account_type: u.account_type,
    points: u.points ?? 0,
    streak_days: u.streak_days ?? 0,
  };
}

function serverError(res: Response, where: string, err: unknown) {
  console.error(where, err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
}

/** Save a hashed refresh token in user_sessions; return the raw token for the client. */
async function issueRefreshToken(userId: number): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex');
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt]
  );
  return raw;
}

/** Assign the correct role in user_roles based on account_type (idempotent). */
async function assignRole(userId: number, accountType: string): Promise<void> {
  const roleName =
    accountType === 'Admin' ? 'admin' : accountType === 'Pro' ? 'pro_user' : 'free_user';
  await query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1::int, id FROM roles WHERE name = $2
     ON CONFLICT DO NOTHING`,
    [userId, roleName]
  );
}

// ── register ─────────────────────────────────────────────────────────────────
export async function register(req: Request, res: Response) {
  const { username, password, phone } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password)
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  if (!USERNAME_RE.test(username))
    return res.status(400).json({ success: false, message: 'Username must be 3-50 characters: letters, digits, _ . -' });
  if (password.length < 8 || password.length > 72)
    return res.status(400).json({ success: false, message: 'Password must be 8-72 characters' });
  if (phone !== undefined && phone !== null && phone !== '' && (typeof phone !== 'string' || !PHONE_RE.test(phone)))
    return res.status(400).json({ success: false, message: 'Phone number format is invalid' });

  try {
    const existing = await query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
    if (existing.rows.length > 0)
      return res.status(409).json({ success: false, message: 'Username is already taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password_hash, phone, account_type, points, streak_days) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, phone, account_type, points, streak_days',
      [username, passwordHash, phone || null, 'Free', 0, 0]
    );
    const user = result.rows[0];
    await assignRole(user.id, 'Free');

    const refreshToken = await issueRefreshToken(user.id);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: signAccessToken(user),
      refresh_token: refreshToken,
      user: publicUser(user),
    });
  } catch (err) {
    return serverError(res, 'Registration error:', err);
  }
}

// ── login ─────────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response) {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password)
    return res.status(400).json({ success: false, message: 'Username and password are required' });

  try {
    const result = await query('SELECT * FROM users WHERE lower(username) = lower($1)', [username]);
    const user = result.rows[0];
    const ok = user ? await bcrypt.compare(password, user.password_hash).catch(() => false) : false;
    if (!user || !ok)
      return res.status(401).json({ success: false, message: 'Invalid username or password' });

    // Ensure role exists (backfill for pre-RBAC users)
    await assignRole(user.id, user.account_type);

    const refreshToken = await issueRefreshToken(user.id);
    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token: signAccessToken(user),
      refresh_token: refreshToken,
      user: publicUser(user),
    });
  } catch (err) {
    return serverError(res, 'Login error:', err);
  }
}

// ── logout ────────────────────────────────────────────────────────────────────
export async function logout(req: AuthenticatedRequest, res: Response) {
  const rawToken = req.body?.refresh_token;
  try {
    if (typeof rawToken === 'string' && rawToken) {
      const hash = hashToken(rawToken);
      await query(
        'UPDATE user_sessions SET revoked = TRUE WHERE refresh_token_hash = $1 AND user_id = $2',
        [hash, req.user?.id]
      );
    }
    // Revoke ALL sessions for the user if no specific token is provided
    if (!rawToken && req.user?.id) {
      await query('UPDATE user_sessions SET revoked = TRUE WHERE user_id = $1', [req.user.id]);
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return serverError(res, 'Logout error:', err);
  }
}

// ── refresh ───────────────────────────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response) {
  const rawToken = req.body?.refresh_token;
  if (typeof rawToken !== 'string' || !rawToken)
    return res.status(400).json({ success: false, message: 'refresh_token is required' });

  try {
    const hash = hashToken(rawToken);
    const sessionRes = await query(
      `SELECT s.id, s.user_id, s.expires_at, s.revoked, u.id AS uid,
              u.username, u.account_type, u.points, u.streak_days, u.phone
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1`,
      [hash]
    );
    const session = sessionRes.rows[0];
    if (!session || session.revoked || new Date(session.expires_at) < new Date())
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });

    // Rotate: revoke old session, issue a new refresh token
    await withTransaction(async (q) => {
      await q('UPDATE user_sessions SET revoked = TRUE WHERE id = $1', [session.id]);
      const newRaw = crypto.randomBytes(48).toString('hex');
      const newHash = hashToken(newRaw);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
      await q(
        'INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)',
        [session.user_id, newHash, expiresAt]
      );
      (session as any)._newRaw = newRaw;
    });

    const user = {
      id: session.uid,
      username: session.username,
      account_type: session.account_type,
      points: session.points,
      streak_days: session.streak_days,
      phone: session.phone,
    };
    return res.status(200).json({
      success: true,
      token: signAccessToken(user),
      refresh_token: (session as any)._newRaw,
      user: publicUser(user),
    });
  } catch (err) {
    return serverError(res, 'Refresh error:', err);
  }
}

// ── /me ───────────────────────────────────────────────────────────────────────
export async function getMe(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const r = await query(
      'SELECT id, username, phone, account_type, points, streak_days FROM users WHERE id = $1',
      [userId]
    );
    if (r.rows.length === 0)
      return res.status(404).json({ success: false, message: 'User not found' });

    const { roles, permissions } = await getUserRolesAndPermissions(userId);
    return res.status(200).json({
      success: true,
      user: publicUser(r.rows[0]),
      roles,
      permissions,
    });
  } catch (err) {
    return serverError(res, 'GET /me error:', err);
  }
}

// ── Google sign-in ────────────────────────────────────────────────────────────
export interface GoogleIdentity {
  sub: string;
  email: string;
  name?: string;
}
export type GoogleVerifier = (idToken: string) => Promise<GoogleIdentity>;

const googleTokenInfoVerifier: GoogleVerifier = async (idToken) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw Object.assign(new Error('Google sign-in is not configured'), { code: 'DISABLED' });
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  if (!r.ok) throw new Error('Google rejected the token');
  const j: any = await r.json();
  if (j.aud !== clientId) throw new Error('Token was issued for a different application');
  if (!(j.email_verified === true || j.email_verified === 'true')) throw new Error('Google email is not verified');
  if (!j.sub || !j.email) throw new Error('Token has no subject or email');
  return { sub: String(j.sub), email: String(j.email), name: j.name };
};

let verifier: GoogleVerifier = googleTokenInfoVerifier;
export function setGoogleVerifier(v: GoogleVerifier | null): void {
  verifier = v || googleTokenInfoVerifier;
}

export async function googleLogin(req: Request, res: Response) {
  const idToken = req.body?.id_token;
  if (typeof idToken !== 'string' || !idToken)
    return res.status(400).json({ success: false, message: 'id_token (the Google credential) is required' });

  let identity: GoogleIdentity;
  try {
    identity = await verifier(idToken);
  } catch (err: any) {
    if (err?.code === 'DISABLED')
      return res.status(501).json({ success: false, message: 'Google sign-in is not configured on this server' });
    return res.status(401).json({ success: false, message: 'Google sign-in failed' });
  }

  try {
    const found = await query('SELECT * FROM users WHERE google_id = $1', [identity.sub]);
    let user = found.rows[0];
    if (!user) {
      const base = identity.email.split('@')[0].replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 40) || 'user';
      let username = base.length >= 3 ? base : base + '_g';
      for (let i = 0; i < 5; i++) {
        const taken = await query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
        if (taken.rows.length === 0) break;
        username = base.slice(0, 40) + '_' + Math.random().toString(36).slice(2, 7);
      }
      const placeholder = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
      const ins = await query(
        'INSERT INTO users (username, password_hash, phone, account_type, google_id, points, streak_days) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [username, placeholder, null, 'Free', identity.sub, 0, 0]
      );
      user = ins.rows[0];
    }
    await assignRole(user.id, user.account_type);

    const refreshToken = await issueRefreshToken(user.id);
    return res.status(200).json({
      success: true,
      message: 'Google login successful',
      token: signAccessToken(user),
      refresh_token: refreshToken,
      user: publicUser(user),
    });
  } catch (err) {
    return serverError(res, 'Google login error:', err);
  }
}

// ── updateProfile ────────────────────────────────────────────────────────────
export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  const body = req.body || {};
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if ('points' in body || 'streak_days' in body)
    return res.status(400).json({ success: false, message: 'points and streak_days cannot be set by the client' });
  if ('account_type' in body) {
    if (!tierToggleEnabled())
      return res.status(403).json({ success: false, message: 'Changing the account type is not allowed' });
    if (body.account_type !== 'Free' && body.account_type !== 'Pro')
      return res.status(400).json({ success: false, message: "account_type must be 'Free' or 'Pro'" });
  }
  if ('phone' in body && body.phone !== null && body.phone !== '' && (typeof body.phone !== 'string' || !PHONE_RE.test(body.phone)))
    return res.status(400).json({ success: false, message: 'Phone number format is invalid' });

  try {
    const result = await query(
      `UPDATE users SET phone = COALESCE($1, phone),
                        account_type = CASE WHEN account_type = 'Admin' THEN account_type ELSE COALESCE($2, account_type) END
       WHERE id = $3
       RETURNING id, username, phone, account_type, points, streak_days`,
      [body.phone || null, body.account_type || null, userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'User not found' });

    // Keep user_roles in sync when account_type changes
    if (body.account_type) {
      const newRole = body.account_type === 'Pro' ? 'pro_user' : 'free_user';
      await query('DELETE FROM user_roles WHERE user_id = $1 AND role_id IN (SELECT id FROM roles WHERE name IN ($2, $3))',
        [userId, 'pro_user', 'free_user']);
      await assignRole(userId, body.account_type);
    }

    return res.status(200).json({ success: true, message: 'Profile updated', user: publicUser(result.rows[0]) });
  } catch (err) {
    return serverError(res, 'Profile update error:', err);
  }
}
