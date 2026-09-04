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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@ptg/ui';
import type { CreateWalletAdjustmentRequest, WalletType } from '@ptg/types';
import { newIdempotencyKey } from '@/lib/api-client';
import { QueryState } from '@/components/query-state';
import { formatDate, formatMoney } from '@/lib/format';
import { useAdjustmentRequests, useCreateAdjustment, useMemberLedger, useReviewAdjustment } from './api';

export default function WalletsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Wallets</h1>
      <Tabs defaultValue="adjustments">
        <TabsList>
          <TabsTrigger value="adjustments">Adjustment requests</TabsTrigger>
          <TabsTrigger value="ledger">Ledger viewer</TabsTrigger>
        </TabsList>
        <TabsContent value="adjustments"><AdjustmentsTab /></TabsContent>
        <TabsContent value="ledger"><LedgerTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function AdjustmentsTab() {
  const [status, setStatus] = React.useState<string | undefined>('PENDING_APPROVAL');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const requestsQuery = useAdjustmentRequests(status);
  const createAdjustment = useCreateAdjustment();
  const reviewAdjustment = useReviewAdjustment();

  const { register, handleSubmit, reset } = useForm<CreateWalletAdjustmentRequest>({
    defaultValues: { walletType: 'E_ACCOUNT', direction: 'IN', currency: 'USD', amountMinor: 0, reason: '' },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Select value={status ?? 'ALL'} onValueChange={(v) => setStatus(v === 'ALL' ? undefined : v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'APPLIED', 'REJECTED'].map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setDialogOpen(true)}>New adjustment</Button>
      </div>

      <QueryState isLoading={requestsQuery.isLoading} isError={requestsQuery.isError} error={requestsQuery.error} onRetry={() => requestsQuery.refetch()} isEmpty={requestsQuery.data?.items.length === 0} emptyTitle="No adjustment requests">
        <DataTable
          rows={requestsQuery.data?.items ?? []}
          getRowKey={(row) => row.id}
          columns={[
            { key: 'member', header: 'Member', render: (row) => row.memberName },
            { key: 'wallet', header: 'Wallet', render: (row) => <Badge variant="secondary">{row.walletType}</Badge> },
            { key: 'amount', header: 'Amount', className: 'num', render: (row) => `${row.direction === 'IN' ? '+' : '-'}${formatMoney(row.amount)}` },
            { key: 'reason', header: 'Reason', render: (row) => <span className="max-w-48 truncate">{row.reason}</span> },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'date', header: 'Requested', render: (row) => formatDate(row.createdAt) },
            { key: 'actions', header: '', render: (row) =>
              row.status === 'PENDING_APPROVAL' ? (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => reviewAdjustment.mutate({ id: row.id, decision: 'APPROVE' }, { onSuccess: () => toast.success('Approved') })}>Approve</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => reviewAdjustment.mutate({ id: row.id, decision: 'REJECT' }, { onSuccess: () => toast.success('Rejected') })}>Reject</Button>
                </div>
              ) : null,
            },
          ]}
        />
      </QueryState>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New wallet adjustment</DialogTitle></DialogHeader>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            onSubmit={handleSubmit((values) =>
              createAdjustment.mutate(
                { ...values, amountMinor: Number(values.amountMinor), idempotencyKey: newIdempotencyKey() },
                { onSuccess: () => { setDialogOpen(false); reset(); toast.success('Adjustment submitted'); }, onError: () => toast.error('Could not submit adjustment') },
              ),
            )}
          >
            <FormField label="Member user ID" required hint="Internal user id (see Users page)"><Input {...register('userId', { required: true })} /></FormField>
            <FormField label="Wallet type" required>
              <select className="h-9 rounded-md border border-input bg-card px-2 text-sm" {...register('walletType', { required: true })}>
                {(['E_ACCOUNT', 'BONUS_POOL'] as WalletType[]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Direction" required>
              <select className="h-9 rounded-md border border-input bg-card px-2 text-sm" {...register('direction', { required: true })}>
                <option value="IN">Credit (IN)</option>
                <option value="OUT">Debit (OUT)</option>
              </select>
            </FormField>
            <FormField label="Amount (minor units)" required><Input type="number" {...register('amountMinor', { required: true, valueAsNumber: true })} /></FormField>
            <FormField label="Currency" required><Input {...register('currency', { required: true })} /></FormField>
            <FormField label="Reason" required className="sm:col-span-2"><Input {...register('reason', { required: true })} /></FormField>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createAdjustment.isPending}>Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LedgerTab() {
  const [userId, setUserId] = React.useState('');
  const [lookupId, setLookupId] = React.useState('');
  const [type, setType] = React.useState<WalletType>('E_ACCOUNT');
  const [page, setPage] = React.useState(1);
  const ledgerQuery = useMemberLedger(lookupId, type, page);

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-wrap items-end gap-2 p-3">
        <FormField label="Member user ID"><Input value={userId} onChange={(e) => setUserId(e.target.value)} className="w-64" /></FormField>
        <Select value={type} onValueChange={(v) => setType(v as WalletType)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['E_ACCOUNT', 'BONUS_POOL', 'PERSONAL_POINTS'] as WalletType[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => { setLookupId(userId); setPage(1); }}>Look up</Button>
      </Card>

      {lookupId ? (
        <QueryState isLoading={ledgerQuery.isLoading} isError={ledgerQuery.isError} error={ledgerQuery.error} onRetry={() => ledgerQuery.refetch()} isEmpty={ledgerQuery.data?.items.length === 0} emptyTitle="No transactions">
          <DataTable
            rows={ledgerQuery.data?.items ?? []}
            getRowKey={(row) => row.id}
            columns={[
              { key: 'type', header: 'Type', render: (row) => <Badge variant="secondary">{row.type}</Badge> },
              { key: 'amount', header: 'Amount', className: 'num', render: (row) => `${row.direction === 'IN' ? '+' : '-'}${formatMoney(row.amount)}` },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              { key: 'description', header: 'Description', render: (row) => row.description },
              { key: 'date', header: 'Date', render: (row) => formatDate(row.createdAt) },
            ]}
          />
        </QueryState>
      ) : null}
    </div>
  );
}
