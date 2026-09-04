import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, FormField, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge, toast } from '@ptg/ui';
import type { InvestmentPlanInput } from '@ptg/types';
import { QueryState } from '@/components/query-state';
import { formatMoney } from '@/lib/format';
import { useAdminInvestmentPlans, useCreateInvestmentPlan, useUpdateInvestmentPlan } from './api';

export default function InvestmentPage() {
  const plansQuery = useAdminInvestmentPlans();
  const createPlan = useCreateInvestmentPlan();
  const updatePlan = useUpdateInvestmentPlan();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { register, handleSubmit, reset } = useForm<InvestmentPlanInput>({
    defaultValues: { name: '', slug: '', minimumAmountMinor: 0, currency: 'USD', status: 'DRAFT' },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Investment Plans</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>New plan</Button>
      </div>
      <p className="text-xs text-muted-foreground">No return or yield is computed by this platform. All figures below are exactly what is entered here.</p>

      <QueryState isLoading={plansQuery.isLoading} isError={plansQuery.isError} error={plansQuery.error} onRetry={() => plansQuery.refetch()} isEmpty={plansQuery.data?.length === 0} emptyTitle="No investment plans yet">
        <div className="flex flex-col gap-2">
          {plansQuery.data?.map((plan) => (
            <Card key={plan.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{plan.name}</p>
                <p className="text-2xs text-muted-foreground">
                  Min {formatMoney(plan.minimumAmount)} {plan.riskLabel ? `· ${plan.riskLabel}` : ''} {plan.termDays ? `· ${plan.termDays} days` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={plan.status} />
                <Select value={plan.status} onValueChange={(status) => updatePlan.mutate({ id: plan.id, status: status as never }, { onSuccess: () => toast.success('Updated') })}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      </QueryState>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New investment plan</DialogTitle></DialogHeader>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            onSubmit={handleSubmit((values) =>
              createPlan.mutate(
                { ...values, minimumAmountMinor: Number(values.minimumAmountMinor) },
                { onSuccess: () => { setDialogOpen(false); reset(); toast.success('Plan created'); } },
              ),
            )}
          >
            <FormField label="Name" required><Input {...register('name', { required: true })} /></FormField>
            <FormField label="Slug" required><Input {...register('slug', { required: true })} /></FormField>
            <FormField label="Minimum amount (minor units)" required><Input type="number" {...register('minimumAmountMinor', { required: true, valueAsNumber: true })} /></FormField>
            <FormField label="Currency" required><Input {...register('currency', { required: true })} /></FormField>
            <FormField label="Term (days)"><Input type="number" {...register('termDays', { valueAsNumber: true })} /></FormField>
            <FormField label="Risk label"><Input {...register('riskLabel')} /></FormField>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createPlan.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
