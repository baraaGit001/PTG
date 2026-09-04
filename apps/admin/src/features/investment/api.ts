import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InvestmentPlanDto, InvestmentPlanInput } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';

export function useAdminInvestmentPlans() {
  return useQuery({ queryKey: ['admin', 'investment-plans'], queryFn: () => apiRequest<InvestmentPlanDto[]>('/admin/investment-plans') });
}

export function useCreateInvestmentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvestmentPlanInput) => apiRequest<InvestmentPlanDto>('/admin/investment-plans', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'investment-plans'] }),
  });
}

export function useUpdateInvestmentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<InvestmentPlanInput> & { id: string }) => apiRequest<InvestmentPlanDto>(`/admin/investment-plans/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'investment-plans'] }),
  });
}
