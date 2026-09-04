import * as React from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  Card,
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
  Timeline,
  toast,
} from '@ptg/ui';
import { newIdempotencyKey } from '@/lib/api-client';
import { QueryState } from '@/components/query-state';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useAdminOrder, useRefundOrder, useUpdateOrderStatus, useUpdateShipment } from './api';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderQuery = useAdminOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const updateShipment = useUpdateShipment();
  const refundOrder = useRefundOrder();

  const [trackingNumber, setTrackingNumber] = React.useState('');
  const [courier, setCourier] = React.useState('');
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [refundReason, setRefundReason] = React.useState('');

  const order = orderQuery.data;

  return (
    <QueryState isLoading={orderQuery.isLoading} isError={orderQuery.isError} error={orderQuery.error} onRetry={() => orderQuery.refetch()} skeletonVariant="detail">
      {order ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <h1 className="text-base font-semibold text-foreground">#{order.orderNumber}</h1>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  <StatusBadge status={order.paymentStatus} />
                </div>
              </div>
              <p className="text-2xs text-muted-foreground">{order.customer.fullName} ({order.customer.memberId})</p>

              <div className="flex flex-col divide-y divide-border">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{item.productName} × {item.quantity}</span>
                    <span className="num">{formatMoney(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="num">{formatMoney(order.total)}</span>
              </div>
            </Card>

            <Card className="flex flex-col gap-2 p-4">
              <h2 className="text-sm font-semibold text-foreground">Timeline</h2>
              <Timeline steps={order.timeline.map((t) => ({ id: t.id, title: t.code.replace(/_/g, ' '), timestamp: formatDateTime(t.createdAt), state: 'complete' }))} />
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="flex flex-col gap-3 p-4">
              <h2 className="text-sm font-semibold text-foreground">Order status</h2>
              <Select value={order.status} onValueChange={(status) => updateStatus.mutate({ id: order.id, status: status as never }, { onSuccess: () => toast.success('Status updated'), onError: () => toast.error('Invalid transition') })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={order.status}>{order.status} (current)</SelectItem>
                  {order.allowedTransitions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Card>

            <Card className="flex flex-col gap-3 p-4">
              <h2 className="text-sm font-semibold text-foreground">Shipment</h2>
              <FormField label="Courier"><Input value={courier} onChange={(e) => setCourier(e.target.value)} /></FormField>
              <FormField label="Tracking number"><Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} /></FormField>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => updateShipment.mutate({ id: order.id, courier, trackingNumber, status: 'SHIPPED' }, { onSuccess: () => toast.success('Marked as shipped') })}>
                  Mark shipped
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateShipment.mutate({ id: order.id, status: 'DELIVERED' }, { onSuccess: () => toast.success('Marked as delivered') })}>
                  Mark delivered
                </Button>
              </div>
            </Card>

            <Card className="flex flex-col gap-3 p-4">
              <h2 className="text-sm font-semibold text-foreground">Refund</h2>
              <Button variant="destructive" size="sm" onClick={() => setRefundOpen(true)}>Issue refund</Button>
            </Card>
          </div>

          <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Issue refund</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">This refunds the full paid amount to the customer&apos;s wallet and cannot be undone.</p>
              <FormField label="Reason" required>
                <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. Customer requested cancellation" />
              </FormField>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  loading={refundOrder.isPending}
                  disabled={!refundReason.trim()}
                  onClick={() =>
                    refundOrder.mutate(
                      { id: order.id, reason: refundReason, idempotencyKey: newIdempotencyKey() },
                      { onSuccess: () => { setRefundOpen(false); toast.success('Refund issued'); }, onError: () => toast.error('Refund failed') },
                    )
                  }
                >
                  Refund
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </QueryState>
  );
}
