import type { ApiResponse, AuthenticatedUser, PaginationMeta } from '@ptg/types';
import { isAdminRole } from '@ptg/types';
import { useAuthStore } from '@/stores/auth.store';
import { ApiClientError } from './api-error';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  allowRefreshRetry?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function refreshAccessToken(): Promise<string | null> {
  const store = useAuthStore.getState();
  if (store.refreshing) return store.refreshing;

  const promise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error('refresh_failed');
      const body = (await response.json()) as ApiResponse<{ tokens: { accessToken: string } }>;
      if (!body.success) throw new Error('refresh_failed');
      useAuthStore.getState().setAccessToken(body.data.tokens.accessToken);
      return body.data.tokens.accessToken;
    } catch {
      useAuthStore.getState().clear();
      return null;
    } finally {
      useAuthStore.getState().setRefreshing(null);
    }
  })();

  useAuthStore.getState().setRefreshing(promise);
  return promise;
}

/** Refuses to keep a session for a user without any admin-eligible role, even if the token is otherwise valid. */
export async function bootstrapSession(): Promise<void> {
  const token = await refreshAccessToken();
  if (token) {
    try {
      const me = await apiRequest<AuthenticatedUser>('/me');
      if (me.roles.some((role) => isAdminRole(role))) {
        useAuthStore.getState().setSession(me, token);
      } else {
        useAuthStore.getState().clear();
      }
    } catch {
      useAuthStore.getState().clear();
    }
  }
  useAuthStore.getState().setBootstrapped(true);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, allowRefreshRetry = true } = options;
  const token = useAuthStore.getState().accessToken;

  const response = await fetch(buildUrl(path, query), {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && allowRefreshRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiRequest<T>(path, { ...options, allowRefreshRetry: false });
  }

  const json = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !json || !json.success) {
    if (json && !json.success) throw new ApiClientError(response.status, json.error);
    throw new ApiClientError(response.status, { code: 'INTERNAL_ERROR', message: 'Unexpected response from the server.' });
  }
  return json.data;
}

export async function apiRequestPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ items: T[]; pagination: PaginationMeta | undefined }> {
  const { method = 'GET', body, query, allowRefreshRetry = true } = options;
  const token = useAuthStore.getState().accessToken;

  const response = await fetch(buildUrl(path, query), {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && allowRefreshRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiRequestPaginated<T>(path, { ...options, allowRefreshRetry: false });
  }

  const json = (await response.json().catch(() => null)) as ApiResponse<T[]> | null;
  if (!response.ok || !json || !json.success) {
    if (json && !json.success) throw new ApiClientError(response.status, json.error);
    throw new ApiClientError(response.status, { code: 'INTERNAL_ERROR', message: 'Unexpected response from the server.' });
  }
  return { items: json.data, pagination: json.meta?.pagination };
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
