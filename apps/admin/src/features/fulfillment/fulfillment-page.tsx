import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Pagination, SearchBar, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge } from '@ptg/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { useAdminOrders } from '@/features/orders/api';

const STATUSES = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

export default function FulfillmentPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string | undefined>();
  const [page, setPage] = React.useState(1);
  const ordersQuery = useAdminOrders({ orderNumber: search || undefined, status: status as never, page, pageSize: 20 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground">Fulfillment</h1>
        <div className="flex gap-2">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search order #…" className="sm:w-56" />
          <Select value={status ?? 'ALL'} onValueChange={(v) => setStatus(v === 'ALL' ? undefined : v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DataTable
        loading={ordersQuery.isLoading}
        rows={ordersQuery.data?.items ?? []}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        emptyTitle="No orders to fulfill"
        columns={[
          { key: 'number', header: 'Order', render: (row) => <span className="num">{row.orderNumber}</span> },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'total', header: 'Total', className: 'num', render: (row) => formatMoney(row.total) },
          { key: 'date', header: 'Placed', render: (row) => formatDate(row.placedAt) },
        ]}
      />
      {ordersQuery.data?.pagination ? <Pagination meta={ordersQuery.data.pagination} onPageChange={setPage} /> : null}
    </div>
  );
}
