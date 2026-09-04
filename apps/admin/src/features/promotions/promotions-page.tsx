import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, FormField, Input, Pagination, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge, toast } from '@ptg/ui';
import type { PromotionInput } from '@ptg/types';
import { QueryState } from '@/components/query-state';
import { formatDate } from '@/lib/format';
import { useAdminPromotions, useCreatePromotion, useUpdatePromotion } from './api';

export default function PromotionsPage() {
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const promotionsQuery = useAdminPromotions(page);
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const { register, handleSubmit, reset } = useForm<PromotionInput>({
    defaultValues: { title: '', status: 'DRAFT', startAt: new Date().toISOString().slice(0, 10) },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Promotions</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>New promotion</Button>
      </div>

      <QueryState isLoading={promotionsQuery.isLoading} isError={promotionsQuery.isError} error={promotionsQuery.error} onRetry={() => promotionsQuery.refetch()} isEmpty={promotionsQuery.data?.items.length === 0} emptyTitle="No promotions yet">
        <div className="flex flex-col gap-2">
          {promotionsQuery.data?.items.map((promo) => (
            <Card key={promo.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{promo.title}</p>
                <p className="text-2xs text-muted-foreground">{formatDate(promo.startAt)}{promo.endAt ? ` – ${formatDate(promo.endAt)}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={promo.status} />
                <Select value={promo.status} onValueChange={(status) => updatePromotion.mutate({ id: promo.id, status: status as never }, { onSuccess: () => toast.success('Updated') })}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'ARCHIVED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
      {promotionsQuery.data?.pagination ? <Pagination meta={promotionsQuery.data.pagination} onPageChange={setPage} /> : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New promotion</DialogTitle></DialogHeader>
          <form
            className="grid grid-cols-1 gap-3"
            onSubmit={handleSubmit((values) => createPromotion.mutate(values, { onSuccess: () => { setDialogOpen(false); reset(); toast.success('Promotion created'); } }))}
          >
            <FormField label="Title" required><Input {...register('title', { required: true })} /></FormField>
            <FormField label="Description"><Input {...register('description')} /></FormField>
            <FormField label="Start date" required><Input type="date" {...register('startAt', { required: true })} /></FormField>
            <FormField label="End date"><Input type="date" {...register('endAt')} /></FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createPromotion.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
