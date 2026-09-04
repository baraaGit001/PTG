import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddressDto, AddressInput } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';

const KEY = ['addresses'];

export function useAddresses() {
  return useQuery({ queryKey: KEY, queryFn: () => apiRequest<AddressDto[]>('/addresses') });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddressInput) => apiRequest<AddressDto>('/addresses', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<AddressInput> & { id: string }) => apiRequest<AddressDto>(`/addresses/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<AddressDto>(`/addresses/${id}/default`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
