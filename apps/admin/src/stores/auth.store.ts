import { create } from 'zustand';
import type { AuthenticatedUser } from '@ptg/types';

interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  bootstrapped: boolean;
  refreshing: Promise<string | null> | null;
  setSession: (user: AuthenticatedUser, accessToken: string) => void;
  setAccessToken: (accessToken: string | null) => void;
  setBootstrapped: (value: boolean) => void;
  setRefreshing: (promise: Promise<string | null> | null) => void;
  clear: () => void;
}

/** Same discipline as the web app's store: access token in memory only, refresh token never reaches JS. */
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
