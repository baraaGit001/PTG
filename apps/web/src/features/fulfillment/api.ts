import { useQuery } from '@tanstack/react-query';
import type { FulfillmentOrderQuery, OrderSummaryDto, PaginationMeta } from '@ptg/types';
import { apiRequestPaginated } from '@/lib/api-client';

export function useFulfillmentOrders(query: FulfillmentOrderQuery & { page?: number }) {
  return useQuery<{ items: OrderSummaryDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['fulfillment-orders', query],
    queryFn: () => apiRequestPaginated<OrderSummaryDto>('/fulfillment-orders', { query: query as Record<string, string | number> }),
  });
}
