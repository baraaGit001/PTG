import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminUserDto, AdminUserQuery, CreateUserRequest, PaginationMeta, UpdateUserRequest } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useAdminUsers(query: AdminUserQuery & { page?: number }) {
  return useQuery<{ items: AdminUserDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'users', query],
    queryFn: () => apiRequestPaginated<AdminUserDto>('/admin/users', { query: query as Record<string, string | number> }),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserRequest) => apiRequest<AdminUserDto>('/admin/users', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateUserRequest & { id: string }) => apiRequest<AdminUserDto>(`/admin/users/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
