import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationCountsDto, NotificationDto, PaginationMeta } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useNotificationCounts(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications', 'counts'],
    queryFn: () => apiRequest<NotificationCountsDto>('/notifications/counts'),
    enabled,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function useNotifications(page: number, enabled: boolean) {
  return useQuery<{ items: NotificationDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['notifications', 'list', page],
    queryFn: () => apiRequestPaginated<NotificationDto>('/notifications', { query: { page, pageSize: 20 } }),
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
