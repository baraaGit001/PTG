import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderRequest, OrderDetailDto, OrderListQuery, OrderSummaryDto, PaginationMeta } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useOrders(query: OrderListQuery & { page?: number }) {
  return useQuery<{ items: OrderSummaryDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['orders', 'list', query],
    queryFn: () => apiRequestPaginated<OrderSummaryDto>('/orders', { query: query as Record<string, string | number> }),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => apiRequest<OrderDetailDto>(`/orders/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderRequest) => apiRequest<OrderDetailDto>('/orders', { method: 'POST', body: payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => apiRequest<OrderDetailDto>(`/orders/${id}/cancel`, { method: 'POST', body: { reason } }),
    onSuccess: (data) => {
      queryClient.setQueryData(['orders', 'detail', data.id], data);
      void queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
    },
  });
}
