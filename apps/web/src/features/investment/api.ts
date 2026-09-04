import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InvestmentEnrollmentDto, InvestmentPlanDto } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';

export function useInvestmentPlans() {
  return useQuery({ queryKey: ['investment', 'plans'], queryFn: () => apiRequest<InvestmentPlanDto[]>('/investment-plans') });
}

export function useMyEnrollments(enabled: boolean) {
  return useQuery({
    queryKey: ['investment', 'enrollments'],
    queryFn: () => apiRequest<InvestmentEnrollmentDto[]>('/investment-plans/enrollments'),
    enabled,
  });
}

export function useEnrollInPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, amountMinor }: { planId: string; amountMinor: number }) =>
      apiRequest<InvestmentEnrollmentDto>(`/investment-plans/${planId}/enroll`, {
        method: 'POST',
        // The endpoint is idempotent on this key, so a retried submit cannot
        // enroll the member twice.
        body: { amountMinor, idempotencyKey: crypto.randomUUID() },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['investment', 'enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
