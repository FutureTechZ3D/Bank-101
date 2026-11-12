/**
 * DEPRECATED — kept as a re-export shim during Phase 0 migration.
 * All new code should import directly from the slice files or from './index'.
 * This file will be deleted after all references are updated.
 */
export { useAuthStore as usePortalStore } from './authStore';
export type { User, AuthActionResult } from './authStore';
