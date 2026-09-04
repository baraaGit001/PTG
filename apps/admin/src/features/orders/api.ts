import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderDetailDto, OrderListQuery, OrderSummaryDto, OrderStatus, PaginationMeta, RefundOrderRequest, UpdateShipmentRequest } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useAdminOrders(query: OrderListQuery & { page?: number }) {
  return useQuery<{ items: OrderSummaryDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'orders', query],
    queryFn: () => apiRequestPaginated<OrderSummaryDto>('/admin/orders', { query: query as Record<string, string | number> }),
  });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'orders', 'detail', id],
    queryFn: () => apiRequest<OrderDetailDto>(`/admin/orders/${id}`),
    enabled: Boolean(id),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) =>
      apiRequest<OrderDetailDto>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status, note } }),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'orders', 'detail', data.id], data);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateShipmentRequest & { id: string }) => apiRequest(`/admin/orders/${id}/shipment`, { method: 'PATCH', body: payload }),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'detail', variables.id] }),
  });
}

export function useRefundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: RefundOrderRequest & { id: string }) => apiRequest<OrderDetailDto>(`/admin/orders/${id}/refund`, { method: 'POST', body: payload }),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'orders', 'detail', data.id], data);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}
