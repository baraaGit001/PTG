import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryDto, PaginationMeta, ProductInput, ProductListQuery, ProductSummaryDto } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useAdminProducts(query: ProductListQuery & { page?: number }) {
  return useQuery<{ items: ProductSummaryDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'products', query],
    queryFn: () => apiRequestPaginated<ProductSummaryDto>('/admin/products', { query: query as Record<string, string | number> }),
  });
}

export function useAdminCategoriesFlat() {
  return useQuery({
    queryKey: ['admin', 'categories', 'flat'],
    queryFn: () => apiRequest<CategoryDto[]>('/admin/categories'),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductInput) => apiRequest('/admin/products', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<ProductInput> & { id: string }) => apiRequest(`/admin/products/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });
}
