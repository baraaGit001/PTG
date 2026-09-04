import * as React from 'react';
import { Badge, DataTable, Pagination, SearchBar } from '@ptg/ui';
import { formatDateTime } from '@/lib/format';
import { useAuditLogs } from './api';

export default function AuditPage() {
  const [action, setAction] = React.useState('');
  const [page, setPage] = React.useState(1);
  const logsQuery = useAuditLogs(page, action || undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground">Audit Logs</h1>
        <SearchBar value={action} onChange={(v) => { setAction(v); setPage(1); }} placeholder="Filter by action…" className="sm:w-64" />
      </div>
      <DataTable
        loading={logsQuery.isLoading}
        rows={logsQuery.data?.items ?? []}
        getRowKey={(row) => row.id}
        emptyTitle="No audit entries"
        columns={[
          { key: 'action', header: 'Action', render: (row) => <Badge variant="secondary">{row.action}</Badge> },
          { key: 'entity', header: 'Entity', render: (row) => `${row.entityType}${row.entityId ? ` #${row.entityId.slice(0, 8)}` : ''}` },
          { key: 'actor', header: 'Actor', render: (row) => row.actorName ?? 'System' },
          { key: 'ip', header: 'IP', render: (row) => row.ipAddress ?? '—' },
          { key: 'date', header: 'When', render: (row) => formatDateTime(row.createdAt) },
        ]}
      />
      {logsQuery.data?.pagination ? <Pagination meta={logsQuery.data.pagination} onPageChange={setPage} /> : null}
    </div>
  );
}
