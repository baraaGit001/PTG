import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ArticleInput, ArticleSummaryDto, PaginationMeta } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useAdminArticles(page = 1) {
  return useQuery<{ items: ArticleSummaryDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'articles', page],
    queryFn: () => apiRequestPaginated<ArticleSummaryDto>('/admin/health/articles', { query: { page, pageSize: 20 } }),
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ArticleInput) => apiRequest('/admin/health/articles', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] }),
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<ArticleInput> & { id: string }) => apiRequest(`/admin/health/articles/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] }),
  });
}
