import { useQuery } from '@tanstack/react-query';
import type { CategoryDto, ProductDetailDto, ProductListQuery, ProductSummaryDto, PaginationMeta } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest<CategoryDto[]>('/categories'),
    staleTime: 5 * 60_000,
  });
}

export function useProducts(query: ProductListQuery & { page?: number; pageSize?: number }) {
  return useQuery<{ items: ProductSummaryDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['products', query],
    queryFn: () => apiRequestPaginated<ProductSummaryDto>('/products', { query: query as Record<string, string | number | boolean> }),
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', slug],
    queryFn: () => apiRequest<ProductDetailDto>(`/products/${slug}`),
    enabled: Boolean(slug),
  });
}
