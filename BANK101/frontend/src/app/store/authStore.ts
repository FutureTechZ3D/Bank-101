/**
 * Auth slice — authentication state and actions.
 * Handles login, register, Google OAuth, logout and session persistence.
 */
import { create } from 'zustand';
import { api, configureApi, errorText, TIER_TOGGLE_ENABLED } from '../../lib/api';

export interface User {
  id: number;
  username: string;
  phone: string | null;
  account_type: string; // 'Free' | 'Pro' | 'Admin'
  points: number;
  streak_days: number;
}

export interface AuthActionResult {
  ok: boolean;
  message?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  authError: string | null;
  isLoading: boolean;

  initAuth: () => void;
  login: (username: string, password: string, remember?: boolean) => Promise<AuthActionResult>;
  register: (username: string, password: string, phone?: string, remember?: boolean) => Promise<AuthActionResult>;
  googleLogin: (idToken: string) => Promise<AuthActionResult>;
  logout: (message?: string) => void;
  updateAccountType: (type: 'Free' | 'Pro') => Promise<AuthActionResult>;
  _setUser: (user: User) => void; // used by exam slice after submit (points/streak update)
}

// ── session storage helpers ──────────────────────────────────────────────────
const TOKEN_KEY = 'bank101_token';
const USER_KEY = 'bank101_user';
const REFRESH_KEY = 'bank101_refresh';

function readSession(): { token: string; user: User } | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const token = store.getItem(TOKEN_KEY);
      const raw = store.getItem(USER_KEY);
      if (!token || !raw) continue;
      const user = JSON.parse(raw);
      if (user && typeof user.id === 'number' && typeof user.username === 'string') return { token, user };
    } catch {
      /* corrupt — treat as logged out */
    }
  }
  return null;
}

export function clearSession() {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY);
    store.removeItem(USER_KEY);
    store.removeItem(REFRESH_KEY);
  }
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
}

export function saveSession(token: string, user: User, remember: boolean, refreshToken?: string) {
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
  if (refreshToken) store.setItem(REFRESH_KEY, refreshToken);
}

export function updateStoredUser(user: User) {
  const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  if (store.getItem(TOKEN_KEY)) store.setItem(USER_KEY, JSON.stringify(user));
}

// ── store ────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => {
  configureApi({
    getToken: () => get().token,
    onSessionExpired: (message) => get().logout(message),
    getRefreshToken: () => getStoredRefreshToken(),
    onTokenRefreshed: (token, refreshToken, user) => {
      // Update stored tokens and state without triggering a full logout
      const store = localStorage.getItem('bank101_token') ? localStorage : sessionStorage;
      store.setItem('bank101_token', token);
      if (refreshToken) store.setItem('bank101_refresh', refreshToken);
      if (user) {
        store.setItem('bank101_user', JSON.stringify(user));
        set({ token, user });
      } else {
        set({ token });
      }
    },
  });

  const authSuccess = (data: any, remember: boolean): AuthActionResult => {
    saveSession(data.token, data.user, remember, data.refresh_token);
    set({ token: data.token, user: data.user, isLoading: false, authError: null });
    return { ok: true };
  };

  const authFailure = (message: string): AuthActionResult => {
    set({ authError: message, isLoading: false });
    return { ok: false, message };
  };

  return {
    token: null,
    user: null,
    authError: null,
    isLoading: false,

    initAuth: () => {
      const s = readSession();
      if (s) set({ token: s.token, user: s.user });
    },

    login: async (username, password, remember = true) => {
      set({ isLoading: true, authError: null });
      const r = await api('/auth/login', { method: 'POST', body: { username, password }, auth: false });
      return r.ok && r.data.success ? authSuccess(r.data, remember) : authFailure(errorText(r, 'Login failed'));
    },

    register: async (username, password, phone, remember = true) => {
      set({ isLoading: true, authError: null });
      const r = await api('/auth/register', { method: 'POST', body: { username, password, phone: phone || undefined }, auth: false });
      return r.ok && r.data.success ? authSuccess(r.data, remember) : authFailure(errorText(r, 'Registration failed'));
    },

    googleLogin: async (idToken) => {
      set({ isLoading: true, authError: null });
      const r = await api('/auth/google-oauth', { method: 'POST', body: { id_token: idToken }, auth: false });
      return r.ok && r.data.success ? authSuccess(r.data, true) : authFailure(errorText(r, 'Google sign-in failed'));
    },

    logout: (message) => {
      // Fire-and-forget server-side session revocation
      const refreshToken = getStoredRefreshToken();
      const token = get().token;
      if (token) {
        api('/auth/logout', { method: 'POST', body: refreshToken ? { refresh_token: refreshToken } : {} }).catch(() => {});
      }
      clearSession();
      set({
        token: null,
        user: null,
        authError: typeof message === 'string' ? message : null,
        isLoading: false,
      });
    },

    updateAccountType: async (type) => {
      const { user } = get();
      if (!get().token || !user) return { ok: false, message: 'Not signed in' };
      if (!TIER_TOGGLE_ENABLED) return { ok: false, message: 'Switching the account type is disabled' };
      const r = await api('/auth/update', { method: 'PUT', body: { account_type: type } });
      if (r.ok && r.data.success) {
        const updated = { ...user, ...(r.data as any).user };
        updateStoredUser(updated);
        set({ user: updated });
        return { ok: true };
      }
      return { ok: false, message: errorText(r, 'Could not change the account type') };
    },

    _setUser: (user) => {
      updateStoredUser(user);
      set({ user });
    },
  };
});
