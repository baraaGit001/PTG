import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CartDto } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

const CART_KEY = ['cart'];

export function useCart() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: CART_KEY,
    queryFn: () => apiRequest<CartDto>('/cart'),
    enabled: Boolean(user),
  });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { variantId: string; quantity: number }) => apiRequest<CartDto>('/cart/items', { method: 'POST', body: payload }),
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => apiRequest<CartDto>(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } }),
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => apiRequest<CartDto>(`/cart/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });
}
