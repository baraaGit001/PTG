import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BonusRecordDto, BonusRecordStatus, BonusRuleDto, BonusRuleInput, PaginationMeta } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useBonusRules() {
  return useQuery({ queryKey: ['admin', 'bonus-rules'], queryFn: () => apiRequest<BonusRuleDto[]>('/admin/bonus-rules') });
}

export function useCreateBonusRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BonusRuleInput) => apiRequest<BonusRuleDto>('/admin/bonus-rules', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'bonus-rules'] }),
  });
}

export function useToggleBonusRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiRequest<BonusRuleDto>(`/admin/bonus-rules/${id}`, { method: 'PATCH', body: { active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'bonus-rules'] }),
  });
}

export function useBonusRecords(status?: BonusRecordStatus, page = 1) {
  return useQuery<{ items: BonusRecordDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'bonus-records', status, page],
    queryFn: () => apiRequestPaginated<BonusRecordDto>('/admin/bonus-records', { query: { status, page, pageSize: 20 } }),
  });
}

export function useCreateBonusRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { memberId: string; ruleId: string; amountMinor: number; currency: string; sourceLabel?: string }) =>
      apiRequest<BonusRecordDto>('/admin/bonus-records', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'bonus-records'] }),
  });
}

export function useTransitionBonusRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BonusRecordStatus }) => apiRequest<BonusRecordDto>(`/admin/bonus-records/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'bonus-records'] }),
  });
}
