import { useQuery } from '@tanstack/react-query';
import type { AdminDashboardDto } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';

export function useAdminDashboard() {
  return useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => apiRequest<AdminDashboardDto>('/admin/dashboard') });
}
