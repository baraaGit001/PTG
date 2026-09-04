import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OrderCard, Pagination } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDate, formatMoney } from '@/lib/format';
import { useOrders } from './api';

export default function OrdersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const ordersQuery = useOrders({ page, pageSize: 10 });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t('orders.title')}</h1>
      <QueryState
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
        error={ordersQuery.error}
        onRetry={() => ordersQuery.refetch()}
        isEmpty={ordersQuery.data?.items.length === 0}
        emptyTitle={t('orders.noOrders')}
      >
        <div className="flex flex-col gap-2">
          {ordersQuery.data?.items.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              formattedTotal={formatMoney(order.total)}
              formattedDate={formatDate(order.placedAt)}
              itemCountLabel={`${order.itemCount} items`}
              onClick={() => navigate(`/orders/${order.id}`)}
            />
          ))}
        </div>
        {ordersQuery.data?.pagination ? <Pagination meta={ordersQuery.data.pagination} onPageChange={setPage} /> : null}
      </QueryState>
    </div>
  );
}
