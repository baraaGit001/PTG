import { useQuery } from '@tanstack/react-query';
import type { CheckoutQuoteDto } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';

export function useCheckoutQuote(addressId: string | undefined, deliveryMethod: string | undefined) {
  return useQuery({
    queryKey: ['checkout', 'quote', addressId, deliveryMethod],
    queryFn: () => apiRequest<CheckoutQuoteDto>('/checkout/quote', { query: { addressId, deliveryMethod } }),
  });
}
