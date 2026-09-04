import { useQuery } from '@tanstack/react-query';
import type { MemberListQuery, MemberSummaryDto, PaginationMeta } from '@ptg/types';
import { apiRequestPaginated } from '@/lib/api-client';

export function useAdminMembers(query: MemberListQuery & { page?: number }) {
  return useQuery<{ items: MemberSummaryDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'members', query],
    queryFn: () => apiRequestPaginated<MemberSummaryDto>('/members', { query: query as Record<string, string | number> }),
  });
}
