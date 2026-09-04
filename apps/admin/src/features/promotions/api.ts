import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationMeta, PromotionDto, PromotionInput } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useAdminPromotions(page = 1) {
  return useQuery<{ items: PromotionDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'promotions', page],
    queryFn: () => apiRequestPaginated<PromotionDto>('/admin/promotions', { query: { page, pageSize: 20 } }),
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PromotionInput) => apiRequest<PromotionDto>('/admin/promotions', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] }),
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<PromotionInput> & { id: string }) => apiRequest<PromotionDto>(`/admin/promotions/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] }),
  });
}
