import { useQuery } from '@tanstack/react-query';
import type { AuditLogDto, PaginationMeta } from '@ptg/types';
import { apiRequestPaginated } from '@/lib/api-client';

export function useAuditLogs(page = 1, action?: string) {
  return useQuery<{ items: AuditLogDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'audit-logs', page, action],
    queryFn: () => apiRequestPaginated<AuditLogDto>('/admin/audit-logs', { query: { page, pageSize: 30, action } }),
  });
}
