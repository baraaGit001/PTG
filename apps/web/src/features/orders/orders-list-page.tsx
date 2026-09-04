import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { OrderStatus } from '@ptg/types';
import { OrderCard, Pagination } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDate, formatMoney } from '@/lib/format';
import { useOrders } from './api';

/** The app's four order-status tabs, in the same order it shows them. */
const STATUS_TABS: Array<{ key: string; status?: OrderStatus }> = [
  { key: 'filterAll' },
  { key: 'shortcut.pay', status: 'PENDING_PAYMENT' },
  { key: 'shortcut.ship', status: 'PAID' },
  { key: 'shortcut.receive', status: 'SHIPPED' },
  { key: 'shortcut.done', status: 'DELIVERED' },
];

export default function OrdersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = React.useState(1);

  const activeStatus = (searchParams.get('status') as OrderStatus | null) ?? undefined;
  const ordersQuery = useOrders({ page, pageSize: 10, status: activeStatus });

  const selectStatus = (status?: OrderStatus) => {
    setPage(1);
    setSearchParams(status ? { status } : {}, { replace: true });
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t('orders.title')}</h1>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.status === activeStatus;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectStatus(tab.status)}
              aria-pressed={isActive}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {t(`orders.${tab.key}`)}
            </button>
          );
        })}
      </div>

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
