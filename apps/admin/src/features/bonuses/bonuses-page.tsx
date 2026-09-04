import * as React from 'react';
import { useForm } from 'react-hook-form';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@ptg/ui';
import type { BonusRecordStatus, BonusRuleInput } from '@ptg/types';
import { formatDate, formatMoney } from '@/lib/format';
import { useBonusRecords, useBonusRules, useCreateBonusRecord, useCreateBonusRule, useToggleBonusRule, useTransitionBonusRecord } from './api';

export default function BonusesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Bonuses</h1>
      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="records"><RecordsTab /></TabsContent>
        <TabsContent value="rules"><RulesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function RecordsTab() {
  const [status, setStatus] = React.useState<BonusRecordStatus | undefined>('PENDING');
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const recordsQuery = useBonusRecords(status, page);
  const rulesQuery = useBonusRules();
  const createRecord = useCreateBonusRecord();
  const transition = useTransitionBonusRecord();

  const { register, handleSubmit, reset } = useForm({ defaultValues: { memberId: '', ruleId: '', amountMinor: 0, currency: 'USD', sourceLabel: '' } });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Select value={status ?? 'ALL'} onValueChange={(v) => setStatus(v === 'ALL' ? undefined : (v as BonusRecordStatus))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['ALL', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setDialogOpen(true)}>New record</Button>
      </div>

      <DataTable
        loading={recordsQuery.isLoading}
        rows={recordsQuery.data?.items ?? []}
        getRowKey={(row) => row.id}
        emptyTitle="No bonus records"
        columns={[
          { key: 'member', header: 'Member', render: (row) => row.memberName },
          { key: 'rule', header: 'Rule', render: (row) => row.rule.name },
          { key: 'amount', header: 'Amount', className: 'num', render: (row) => formatMoney(row.amount) },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'date', header: 'Created', render: (row) => formatDate(row.createdAt) },
          { key: 'actions', header: '', render: (row) => (
            <div className="flex gap-1">
              {row.status === 'PENDING' ? <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: row.id, status: 'APPROVED' }, { onSuccess: () => toast.success('Approved') })}>Approve</Button> : null}
              {row.status === 'APPROVED' ? <Button size="sm" onClick={() => transition.mutate({ id: row.id, status: 'PAID' }, { onSuccess: () => toast.success('Paid') })}>Pay</Button> : null}
              {row.status === 'PENDING' ? <Button size="sm" variant="ghost" className="text-destructive" onClick={() => transition.mutate({ id: row.id, status: 'REJECTED' })}>Reject</Button> : null}
            </div>
          ) },
        ]}
      />
      {recordsQuery.data?.pagination ? <Pagination meta={recordsQuery.data.pagination} onPageChange={setPage} /> : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New bonus record</DialogTitle></DialogHeader>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            onSubmit={handleSubmit((values) =>
              createRecord.mutate(
                { ...values, amountMinor: Number(values.amountMinor) },
                { onSuccess: () => { setDialogOpen(false); reset(); toast.success('Record created'); } },
              ),
            )}
          >
            <FormField label="Member user ID" required><Input {...register('memberId', { required: true })} /></FormField>
            <FormField label="Rule" required>
              <select className="h-9 rounded-md border border-input bg-card px-2 text-sm" {...register('ruleId', { required: true })}>
                <option value="">Select…</option>
                {rulesQuery.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </FormField>
            <FormField label="Amount (minor units)" required><Input type="number" {...register('amountMinor', { required: true, valueAsNumber: true })} /></FormField>
            <FormField label="Currency" required><Input {...register('currency', { required: true })} /></FormField>
            <FormField label="Source note" className="sm:col-span-2"><Input {...register('sourceLabel')} /></FormField>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createRecord.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RulesTab() {
  const rulesQuery = useBonusRules();
  const createRule = useCreateBonusRule();
  const toggleRule = useToggleBonusRule();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { register, handleSubmit, reset } = useForm<BonusRuleInput>({
    defaultValues: { name: '', code: '', type: 'CUSTOM', active: true, configuration: {}, effectiveFrom: new Date().toISOString().slice(0, 10) },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>New rule</Button>
      </div>
      <div className="flex flex-col gap-2">
        {rulesQuery.data?.map((rule) => (
          <Card key={rule.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{rule.name}</p>
              <p className="text-2xs text-muted-foreground">{rule.code} · <Badge variant="secondary">{rule.type}</Badge></p>
            </div>
            <Switch checked={rule.active} onCheckedChange={(active) => toggleRule.mutate({ id: rule.id, active })} />
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New bonus rule</DialogTitle></DialogHeader>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            onSubmit={handleSubmit((values) => createRule.mutate(values, { onSuccess: () => { setDialogOpen(false); reset(); toast.success('Rule created'); } }))}
          >
            <FormField label="Name" required><Input {...register('name', { required: true })} /></FormField>
            <FormField label="Code" required><Input {...register('code', { required: true })} /></FormField>
            <FormField label="Effective from" required><Input type="date" {...register('effectiveFrom', { required: true })} /></FormField>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createRule.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
