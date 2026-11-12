/**
 * RBAC middleware — role and permission guards.
 *
 * Both middlewares read from the database, never from the JWT payload alone,
 * so a stale or forged token cannot retain permissions that were revoked.
 *
 * Always use AFTER authMiddleware so req.user.id is set.
 */
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { query } from '../config/db';

function serverError(res: Response, where: string, err: unknown) {
  console.error(where, err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
}

/**
 * requireRole('admin') — the user must have that role in user_roles.
 * Also handles legacy account_type for backwards compatibility while
 * old rows are migrated.
 */
export function requireRole(roleName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    try {
      // Check the roles table first (new RBAC path)
      const rbac = await query(
        `SELECT 1 FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1 AND r.name = $2 LIMIT 1`,
        [userId, roleName]
      );
      if (rbac.rows.length > 0) return next();

      // Legacy fallback: account_type column (admin → 'Admin', pro_user → 'Pro', etc.)
      if (roleName === 'admin') {
        const legacy = await query('SELECT account_type FROM users WHERE id = $1', [userId]);
        if (legacy.rows[0]?.account_type === 'Admin') return next();
      }

      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    } catch (err) {
      return serverError(res, 'requireRole error:', err);
    }
  };
}

/**
 * requirePermission('admin.users.read') — the user must have that specific permission
 * via at least one of their roles.
 */
export function requirePermission(permissionName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    try {
      const r = await query(
        `SELECT 1 FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE ur.user_id = $1 AND p.name = $2 LIMIT 1`,
        [userId, permissionName]
      );
      if (r.rows.length > 0) return next();

      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    } catch (err) {
      return serverError(res, 'requirePermission error:', err);
    }
  };
}

/**
 * Returns the full role and permission set for a user — useful for the /auth/me endpoint.
 */
export async function getUserRolesAndPermissions(userId: number): Promise<{ roles: string[]; permissions: string[] }> {
  // Get roles
  const rolesRes = await query(
    `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [userId]
  );
  const roles = rolesRes.rows.map((x: any) => x.name).filter(Boolean) as string[];

  // Get permissions via roles
  const permsRes = await query(
    `SELECT DISTINCT p.name FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  const permissions = permsRes.rows.map((x: any) => x.name).filter(Boolean) as string[];

  return { roles, permissions };
}
