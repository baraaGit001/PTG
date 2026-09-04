import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AddressCard, Button, Card, EmptyState, StatusBadge } from '@ptg/ui';
import type { DeliveryMethod, PaymentMethod } from '@ptg/types';
import { QueryState } from '@/components/query-state';
import { formatMoney } from '@/lib/format';
import { newIdempotencyKey } from '@/lib/api-client';
import { useAddresses } from '@/features/addresses/api';
import { useCheckoutQuote } from './api';
import { useCreateOrder } from '@/features/orders/api';
import { isApiClientError } from '@/lib/api-error';
import { toast } from '@ptg/ui';

const PAYMENT_METHODS: PaymentMethod[] = ['E_ACCOUNT', 'BONUS_POOL', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'];

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addressesQuery = useAddresses();
  const [addressId, setAddressId] = React.useState<string | undefined>();
  const [deliveryMethod, setDeliveryMethod] = React.useState<DeliveryMethod>('STANDARD');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('E_ACCOUNT');
  const [idempotencyKey] = React.useState(() => newIdempotencyKey());

  React.useEffect(() => {
    if (!addressId && addressesQuery.data) {
      setAddressId(addressesQuery.data.find((a) => a.isDefault)?.id ?? addressesQuery.data[0]?.id);
    }
  }, [addressId, addressesQuery.data]);

  const quoteQuery = useCheckoutQuote(addressId, deliveryMethod);
  const createOrder = useCreateOrder();

  const handlePlaceOrder = () => {
    if (!addressId) return;
    createOrder.mutate(
      { addressId, deliveryMethod, paymentMethod, idempotencyKey },
      {
        onSuccess: (order) => navigate(`/orders/${order.id}`, { replace: true }),
        onError: (error) => {
          toast.error(isApiClientError(error) ? error.message : t('errors.generic'));
        },
      },
    );
  };

  if (addressesQuery.data && addressesQuery.data.length === 0) {
    return (
      <EmptyState
        title="Add an address to check out"
        action={<Button onClick={() => navigate('/app/addresses')}>{t('nav.addresses')}</Button>}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="text-sm font-semibold text-foreground">1. Shipping address</h2>
          <div className="flex flex-col gap-2">
            {addressesQuery.data?.map((address) => (
              <AddressCard key={address.id} address={address} selectable selected={address.id === addressId} onSelect={() => setAddressId(address.id)} />
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="text-sm font-semibold text-foreground">2. Delivery method</h2>
          <div className="flex flex-col gap-2">
            {quoteQuery.data?.availableShippingMethods.map((method) => (
              <label key={method.id} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <input type="radio" checked={deliveryMethod === method.code} onChange={() => setDeliveryMethod(method.code)} />
                  <span>
                    {method.name}
                    <span className="block text-2xs text-muted-foreground">{method.description}</span>
                  </span>
                </span>
                <span className="num">{formatMoney(method.price)}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="text-sm font-semibold text-foreground">3. Payment method</h2>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <label key={method} className={`flex items-center gap-2 rounded-md border p-2.5 text-sm ${paymentMethod === method ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                {method.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </Card>
      </div>

      <QueryState isLoading={quoteQuery.isLoading} isError={quoteQuery.isError} error={quoteQuery.error} onRetry={() => quoteQuery.refetch()} skeletonVariant="detail">
        {quoteQuery.data ? (
          <Card className="flex h-fit flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Order summary</h2>
            {quoteQuery.data.cart.issues.length > 0 ? (
              <div className="flex flex-col gap-1">
                {quoteQuery.data.cart.issues.map((issue, i) => (
                  <StatusBadge key={i} status="FAILED" label={issue.message} />
                ))}
              </div>
            ) : null}
            <SummaryRow label={t('marketplace.subtotal')} value={formatMoney(quoteQuery.data.totals.subtotal)} />
            <SummaryRow label={t('marketplace.shipping')} value={formatMoney(quoteQuery.data.totals.shipping)} />
            <SummaryRow label={t('marketplace.total')} value={formatMoney(quoteQuery.data.totals.total)} bold />
            <Button
              onClick={handlePlaceOrder}
              loading={createOrder.isPending}
              disabled={!addressId || quoteQuery.data.cart.items.length === 0 || quoteQuery.data.cart.issues.some((i) => i.code === 'INSUFFICIENT_STOCK')}
            >
              {t('orders.placeOrder')}
            </Button>
          </Card>
        ) : null}
      </QueryState>
    </div>
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
