import { useQuery } from '@tanstack/react-query';
import type { BonusRecordDto, BonusRecordQuery, BonusSummaryDto, PaginationMeta } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useBonusSummary() {
  return useQuery({ queryKey: ['bonuses', 'summary'], queryFn: () => apiRequest<BonusSummaryDto>('/bonuses/summary') });
}

export function useBonusRecords(query: BonusRecordQuery & { page?: number }) {
  return useQuery<{ items: BonusRecordDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['bonuses', 'list', query],
    queryFn: () => apiRequestPaginated<BonusRecordDto>('/bonuses', { query: query as Record<string, string | number> }),
  });
}
