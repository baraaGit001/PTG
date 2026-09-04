import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryDto, CategoryInput } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';

export function useAdminCategories() {
  return useQuery({ queryKey: ['admin', 'categories'], queryFn: () => apiRequest<CategoryDto[]>('/admin/categories') });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryInput) => apiRequest<CategoryDto>('/admin/categories', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });
}
