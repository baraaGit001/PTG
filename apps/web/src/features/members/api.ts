import { useQuery } from '@tanstack/react-query';
import type { MemberListQuery, MemberReportSummaryDto, MemberSummaryDto, PaginationMeta, TreeKind, TreeQuery, TreeResponse } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useMembers(query: MemberListQuery & { page?: number }) {
  return useQuery<{ items: MemberSummaryDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['members', 'list', query],
    queryFn: () => apiRequestPaginated<MemberSummaryDto>('/members', { query: query as Record<string, string | number> }),
  });
}

export function useMemberReport(from?: string, to?: string) {
  return useQuery({
    queryKey: ['members', 'report', from, to],
    queryFn: () => apiRequest<MemberReportSummaryDto>('/members/report', { query: { from, to } }),
  });
}

export function useTree(kind: TreeKind, query: TreeQuery, enabled = true) {
  return useQuery({
    queryKey: ['members', 'tree', kind, query],
    queryFn: () => apiRequest<TreeResponse>(`/members/tree/${kind.toLowerCase()}`, { query: query as Record<string, string | number> }),
    enabled,
  });
}
