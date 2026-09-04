import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateWalletAdjustmentRequest, PaginationMeta, WalletAdjustmentRequestDto, WalletTransactionDto, WalletType } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useAdjustmentRequests(status?: string, page = 1) {
  return useQuery<{ items: WalletAdjustmentRequestDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'wallets', 'adjustments', status, page],
    queryFn: () => apiRequestPaginated<WalletAdjustmentRequestDto>('/admin/wallets/adjustments', { query: { status, page, pageSize: 20 } }),
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWalletAdjustmentRequest) => apiRequest<WalletAdjustmentRequestDto>('/admin/wallets/adjustments', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'wallets', 'adjustments'] }),
  });
}

export function useReviewAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'APPROVE' | 'REJECT'; note?: string }) =>
      apiRequest<WalletAdjustmentRequestDto>(`/admin/wallets/adjustments/${id}/review`, { method: 'PATCH', body: { decision, note } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'wallets', 'adjustments'] }),
  });
}

export function useMemberLedger(userId: string, type: WalletType, page: number) {
  return useQuery<{ items: WalletTransactionDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'wallets', 'ledger', userId, type, page],
    queryFn: () => apiRequestPaginated<WalletTransactionDto>(`/admin/wallets/${userId}/${type}/transactions`, { query: { page, pageSize: 15 } }),
    enabled: Boolean(userId),
  });
}
