import { useQuery } from '@tanstack/react-query';
import type { DashboardDto } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest<DashboardDto>('/dashboard'),
  });
}
