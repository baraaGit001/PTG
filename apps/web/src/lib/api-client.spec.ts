import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client';
import { isApiClientError } from './api-error';
import { useAuthStore } from '@/stores/auth.store';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('apiRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, bootstrapped: true, refreshing: null });
  });

  it('returns the unwrapped `data` field on a successful envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { hello: 'world' } })));
    const result = await apiRequest<{ hello: string }>('/ping');
    expect(result).toEqual({ hello: 'world' });
  });

  it('throws an ApiClientError carrying the stable error code on a business error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ success: false, error: { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock.' } }, 409)),
    );

    let caught: unknown;
    try {
      await apiRequest('/cart/items');
    } catch (error) {
      caught = error;
    }

    expect(isApiClientError(caught)).toBe(true);
    if (isApiClientError(caught)) {
      expect(caught.code).toBe('INSUFFICIENT_STOCK');
      expect(caught.status).toBe(409);
    }
  });

  it('attaches the bearer token from the auth store when one is present', async () => {
    useAuthStore.setState({ accessToken: 'test-token' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/me');

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
  });

  it('retries once through a silent refresh after a 401, then gives up if the refresh also fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: 'UNAUTHENTICATED', message: 'x' } }, 401)) // original request
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: 'TOKEN_INVALID', message: 'x' } }, 401)); // refresh attempt
    vi.stubGlobal('fetch', fetchMock);

    let caught: unknown;
    try {
      await apiRequest('/me');
    } catch (error) {
      caught = error;
    }

    expect(isApiClientError(caught)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
