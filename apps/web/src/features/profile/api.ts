import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthenticatedUser } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  return useMutation({
    mutationFn: (payload: { fullName?: string; displayName?: string; phone?: string; locale?: string }) =>
      apiRequest<AuthenticatedUser>('/profile', { method: 'PATCH', body: payload }),
    onSuccess: (user) => {
      if (accessToken) setSession(user, accessToken);
      void queryClient.invalidateQueries();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) => apiRequest('/auth/change-password', { method: 'POST', body: payload }),
  });
}
