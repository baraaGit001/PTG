import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, ConfirmDialog, StatusBadge, Timeline, toast } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useCancelOrder, useOrder } from './api';

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const orderQuery = useOrder(id);
  const cancelOrder = useCancelOrder();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const order = orderQuery.data;

  return (
    <QueryState isLoading={orderQuery.isLoading} isError={orderQuery.isError} error={orderQuery.error} onRetry={() => orderQuery.refetch()} skeletonVariant="detail">
      {order ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <h1 className="text-base font-semibold text-foreground">
                  {t('orders.orderNumber')} #{order.orderNumber}
                </h1>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-2xs text-muted-foreground">{formatDateTime(order.placedAt)}</p>

              <div className="flex flex-col divide-y divide-border">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2.5">
                    <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">{item.productName}</span>
                      <span className="text-2xs text-muted-foreground">
                        {item.variantName} × {item.quantity}
                      </span>
                    </div>
                    <span className="num text-sm font-semibold text-foreground">{formatMoney(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h2 className="text-sm font-semibold text-foreground">Tracking</h2>
              <Timeline
                steps={order.timeline.map((entry) => ({
                  id: entry.id,
                  title: entry.code.replace(/_/g, ' '),
                  description: entry.note ?? undefined,
                  timestamp: formatDateTime(entry.createdAt),
                  state: 'complete',
                }))}
              />
              {order.shipments[0]?.trackingNumber ? (
                <p className="text-xs text-muted-foreground">
                  {t('orders.trackingNumber')}: <span className="num font-medium text-foreground">{order.shipments[0].trackingNumber}</span>
                </p>
              ) : null}
            </Card>
          </div>

          <Card className="flex h-fit flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Summary</h2>
            <SummaryRow label={t('marketplace.subtotal')} value={formatMoney(order.subtotal)} />
            <SummaryRow label={t('marketplace.shipping')} value={formatMoney(order.shipping)} />
            <SummaryRow label={t('marketplace.total')} value={formatMoney(order.total)} bold />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Payment status</span>
              <StatusBadge status={order.paymentStatus} />
            </div>
            <div className="rounded-md border border-border p-2.5 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{order.shippingAddress.recipientName}</p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}
              </p>
            </div>
            {order.allowedTransitions.includes('CANCELLED') ? (
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                {t('orders.cancelOrder')}
              </Button>
            ) : null}
          </Card>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={t('orders.cancelOrder')}
            description="This cannot be undone."
            destructive
            loading={cancelOrder.isPending}
            onConfirm={() =>
              cancelOrder.mutate(
                { id: order.id },
                {
                  onSuccess: () => {
                    setConfirmOpen(false);
                    toast.success('Order cancelled');
                  },
                },
              )
            }
          />
        </div>
      ) : null}
    </QueryState>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
