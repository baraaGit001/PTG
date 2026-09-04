import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginRequest, LoginResponse } from '@ptg/types';
import { isAdminRole } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';
import { ApiClientError } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const data = await apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: payload, allowRefreshRetry: false });
      if (!data.user.roles.some((role) => isAdminRole(role))) {
        throw new ApiClientError(403, { code: 'FORBIDDEN', message: 'This account does not have access to the admin console.' });
      }
      return data;
    },
    onSuccess: (data) => {
      setSession(data.user, data.tokens.accessToken);
      void queryClient.invalidateQueries();
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allSessions: boolean) => apiRequest('/auth/logout', { method: 'POST', body: { allSessions } }),
    onSuccess: () => {
      clear();
      queryClient.clear();
    },
  });
}
