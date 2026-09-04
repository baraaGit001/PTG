import { useQuery } from '@tanstack/react-query';
import type { PublicSettingsDto } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';

export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => apiRequest<PublicSettingsDto>('/settings/public'),
    staleTime: 5 * 60_000,
  });
}
