import { create } from 'zustand';
import type { AuthenticatedUser } from '@ptg/types';

interface AuthState {
  user: AuthenticatedUser | null;
  /** In-memory only, never persisted - a page reload re-derives it via a silent /auth/refresh using the httpOnly refresh cookie. */
  accessToken: string | null;
  /** True once the initial silent-refresh-on-load attempt has finished (success or failure). */
  bootstrapped: boolean;
  /** Shared by concurrent 401 handlers so only one refresh request is ever in flight. */
  refreshing: Promise<string | null> | null;
  setSession: (user: AuthenticatedUser, accessToken: string) => void;
  setAccessToken: (accessToken: string | null) => void;
  setBootstrapped: (value: boolean) => void;
  setRefreshing: (promise: Promise<string | null> | null) => void;
  clear: () => void;
}

/**
 * Client-global auth state only - server state (orders, wallet, ...) always
 * lives in TanStack Query, never here. Nothing here is persisted to
 * localStorage/sessionStorage: the access token is memory-only, and the
 * refresh token never reaches JavaScript at all (httpOnly, SameSite=Strict
 * cookie set by the API - see api-client.ts).
 */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  bootstrapped: false,
  refreshing: null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
  setRefreshing: (refreshing) => set({ refreshing }),
  clear: () => set({ user: null, accessToken: null, refreshing: null }),
}));
