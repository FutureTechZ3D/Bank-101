/**
 * One place for every call to the backend.
 *  - adds the Bearer token,
 *  - never throws: network problems and bad JSON become { ok:false, status:0, data:{ success:false, message } },
 *  - when the server says the token is missing/invalid/expired the session is ended once, centrally.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '/api/v1';

export interface ApiReply<T = any> {
  ok: boolean;
  status: number;
  data: T & { success?: boolean; message?: string; error?: string };
}

let getToken: () => string | null = () => null;
let onSessionExpired: (message: string) => void = () => {};
let getRefreshToken: () => string | null = () => null;
let onTokenRefreshed: (token: string, refreshToken: string, user: any) => void = () => {};

/** Called once by the store so this file does not import the store (avoids a circular import). */
export function configureApi(opts: {
  getToken: () => string | null;
  onSessionExpired: (message: string) => void;
  getRefreshToken?: () => string | null;
  onTokenRefreshed?: (token: string, refreshToken: string, user: any) => void;
}) {
  getToken = opts.getToken;
  onSessionExpired = opts.onSessionExpired;
  if (opts.getRefreshToken) getRefreshToken = opts.getRefreshToken;
  if (opts.onTokenRefreshed) onTokenRefreshed = opts.onTokenRefreshed;
}

/** The backend answers 401 for a missing token and 403 'Invalid or expired token' for a bad one (other 403s are business rules). */
function isAuthFailure(status: number, data: any): boolean {
  if (status === 401) return true;
  return status === 403 && typeof data?.message === 'string' && /invalid or expired token/i.test(data.message);
}

export async function api<T = any>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<ApiReply<T>> {
  const headers: Record<string, string> = {};
  const auth = init.auth !== false;
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: init.method || 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, data: { success: false, message: 'Cannot reach the server. Check your connection and try again.' } as any };
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: 'The server sent an unreadable reply.' };
  }

  if (auth && token && isAuthFailure(res.status, data)) {
    // Try to refresh the access token before giving up
    const refreshToken = getRefreshToken();
    if (refreshToken && res.status === 403) {
      try {
        const refreshRes = await fetch(API_BASE + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const refreshData = await refreshRes.json().catch(() => null);
        if (refreshRes.ok && refreshData?.token) {
          onTokenRefreshed(refreshData.token, refreshData.refresh_token, refreshData.user);
          // Retry the original request with the new token
          const retryHeaders: Record<string, string> = { Authorization: `Bearer ${refreshData.token}` };
          if (init.body !== undefined) retryHeaders['Content-Type'] = 'application/json';
          const retryRes = await fetch(API_BASE + path, {
            method: init.method || 'GET',
            headers: retryHeaders,
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
          });
          const retryData = await retryRes.json().catch(() => ({ success: false, message: 'Unreadable reply' }));
          return { ok: retryRes.ok, status: retryRes.status, data: retryData };
        }
      } catch {
        // refresh failed — fall through to session expiry
      }
    }
    onSessionExpired('Your session has expired. Please log in again.');
  }
  return { ok: res.ok, status: res.status, data };
}

/** Best human-readable message from a failed reply. */
export function errorText(r: ApiReply, fallback = 'Something went wrong. Please try again.'): string {
  return r.data?.message || r.data?.error || fallback;
}

/** Build-time flags (set in frontend/.env, see .env.example). */
export const GOOGLE_CLIENT_ID: string = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
export const TIER_TOGGLE_ENABLED: boolean = (import.meta as any).env?.VITE_ENABLE_TIER_TOGGLE === 'true';
