import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginRequest, LoginResponse } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginRequest) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: payload, allowRefreshRetry: false }),
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

export function useForgotPassword() {
  return useMutation({
    mutationFn: (memberId: string) => apiRequest('/auth/forgot-password', { method: 'POST', body: { memberId }, allowRefreshRetry: false }),
  });
}
