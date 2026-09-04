import * as React from 'react';
import { Badge, Button, Card, DataTable, FormField, Input, StatusBadge } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDate } from '@/lib/format';
import { useMemberLedger } from '@/features/wallets/api';

export default function PointsPage() {
  const [userId, setUserId] = React.useState('');
  const [lookupId, setLookupId] = React.useState('');
  const [page, setPage] = React.useState(1);
  const ledgerQuery = useMemberLedger(lookupId, 'PERSONAL_POINTS', page);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Points</h1>
      <p className="text-xs text-muted-foreground">Look up a member&apos;s personal points ledger. Points are earned automatically on paid orders and adjusted via the API.</p>

      <Card className="flex flex-wrap items-end gap-2 p-3">
        <FormField label="Member user ID"><Input value={userId} onChange={(e) => setUserId(e.target.value)} className="w-64" /></FormField>
        <Button onClick={() => { setLookupId(userId); setPage(1); }}>Look up</Button>
      </Card>

      {lookupId ? (
        <QueryState isLoading={ledgerQuery.isLoading} isError={ledgerQuery.isError} error={ledgerQuery.error} onRetry={() => ledgerQuery.refetch()} isEmpty={ledgerQuery.data?.items.length === 0} emptyTitle="No point transactions">
          <DataTable
            rows={ledgerQuery.data?.items ?? []}
            getRowKey={(row) => row.id}
            columns={[
              { key: 'type', header: 'Type', render: (row) => <Badge variant="secondary">{row.type}</Badge> },
              { key: 'amount', header: 'Points', className: 'num', render: (row) => `${row.direction === 'IN' ? '+' : '-'}${row.amount.amountMinor}` },
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
