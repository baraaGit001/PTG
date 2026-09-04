import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DataTable, Pagination, SearchBar, StatusBadge } from '@ptg/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { useFulfillmentOrders } from './api';

export default function FulfillmentOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const query = useFulfillmentOrders({ customer: search || undefined, page, pageSize: 20 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground">{t('nav.fulfillmentOrders')}</h1>
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search customer…" className="sm:max-w-xs" />
      </div>
      <DataTable
        loading={query.isLoading}
        rows={query.data?.items ?? []}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        emptyTitle="No fulfillment orders"
        columns={[
          { key: 'number', header: t('orders.orderNumber'), render: (row) => <span className="num">{row.orderNumber}</span> },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'payment', header: 'Payment', render: (row) => <StatusBadge status={row.paymentStatus} /> },
          { key: 'items', header: 'Items', className: 'num', render: (row) => row.itemCount },
          { key: 'total', header: 'Total', className: 'num', render: (row) => formatMoney(row.total) },
          { key: 'date', header: 'Placed', render: (row) => formatDate(row.placedAt) },
        ]}
      />
      {query.data?.pagination ? <Pagination meta={query.data.pagination} onPageChange={setPage} /> : null}
    </div>
  );
}
