import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Pagination, SearchBar, StatusBadge } from '@ptg/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { useAdminOrders } from './api';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const ordersQuery = useAdminOrders({ orderNumber: search || undefined, page, pageSize: 20 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground">Orders</h1>
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search order #…" className="sm:w-64" />
      </div>
      <DataTable
        loading={ordersQuery.isLoading}
        rows={ordersQuery.data?.items ?? []}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        emptyTitle="No orders found"
        columns={[
          { key: 'number', header: 'Order', render: (row) => <span className="num">{row.orderNumber}</span> },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'payment', header: 'Payment', render: (row) => <StatusBadge status={row.paymentStatus} /> },
          { key: 'total', header: 'Total', className: 'num', render: (row) => formatMoney(row.total) },
          { key: 'date', header: 'Placed', render: (row) => formatDate(row.placedAt) },
        ]}
      />
      {ordersQuery.data?.pagination ? <Pagination meta={ordersQuery.data.pagination} onPageChange={setPage} /> : null}
    </div>
  );
}
