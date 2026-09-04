import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SystemSettingDto } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';

export function useAdminSettings() {
  return useQuery({ queryKey: ['admin', 'settings'], queryFn: () => apiRequest<SystemSettingDto[]>('/admin/settings') });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => apiRequest<SystemSettingDto>(`/admin/settings/${key}`, { method: 'PUT', body: { value } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  });
}
