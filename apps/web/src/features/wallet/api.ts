import { useQuery } from '@tanstack/react-query';
import type { PaginationMeta, PointSummaryDto, PointTransactionDto, WalletSummaryDto, WalletTransactionDto, WalletType } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useWalletSummary() {
  return useQuery({ queryKey: ['wallet', 'summary'], queryFn: () => apiRequest<WalletSummaryDto>('/wallets') });
}

export function useWalletTransactions(type: WalletType, page: number) {
  return useQuery<{ items: WalletTransactionDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['wallet', 'transactions', type, page],
    queryFn: () => apiRequestPaginated<WalletTransactionDto>(`/wallets/${type}/transactions`, { query: { page, pageSize: 15 } }),
  });
}

export function usePointsSummary() {
  return useQuery({ queryKey: ['points', 'summary'], queryFn: () => apiRequest<PointSummaryDto>('/points') });
}

export function usePointsTransactions(page: number) {
  return useQuery<{ items: PointTransactionDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['points', 'transactions', page],
    queryFn: () => apiRequestPaginated<PointTransactionDto>('/points/transactions', { query: { page, pageSize: 15 } }),
  });
}
