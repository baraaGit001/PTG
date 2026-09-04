import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatMoney } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { useCart, useRemoveCartItem, useUpdateCartItem } from './api';

export default function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const cartQuery = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  if (!user) {
    return (
      <EmptyState
        title={t('marketplace.emptyCart')}
        description="Sign in to view your cart."
        action={<Button onClick={() => navigate('/login', { state: { from: '/cart' } })}>{t('common.signIn')}</Button>}
      />
    );
  }

  const cart = cartQuery.data;

  return (
    <QueryState
      isLoading={cartQuery.isLoading}
      isError={cartQuery.isError}
      error={cartQuery.error}
      onRetry={() => cartQuery.refetch()}
      isEmpty={cart?.items.length === 0}
      emptyTitle={t('marketplace.emptyCart')}
      skeletonVariant="list"
    >
      {cart ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">
            {cart.items.map((item) => (
              <Card key={item.id} className="flex items-center gap-3 p-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-foreground">{item.productName}</span>
                  <span className="text-2xs text-muted-foreground">{item.variantName}</span>
                  {item.priceChangedFrom ? <span className="text-2xs text-warning">Price updated to {formatMoney(item.unitPrice)}</span> : null}
                  {item.stockStatus === 'OUT_OF_STOCK' ? <span className="text-2xs text-destructive">{t('marketplace.outOfStock')}</span> : null}
                </div>
                <div className="flex items-center rounded-md border border-border">
                  <button className="flex size-7 items-center justify-center" onClick={() => updateItem.mutate({ itemId: item.id, quantity: Math.max(0, item.quantity - 1) })}>
                    <Minus className="size-3" />
                  </button>
                  <span className="num w-6 text-center text-xs">{item.quantity}</span>
                  <button className="flex size-7 items-center justify-center" onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}>
                    <Plus className="size-3" />
                  </button>
                </div>
                <span className="num w-20 text-right text-sm font-semibold text-foreground">{formatMoney(item.lineTotal)}</span>
                <button className="text-muted-foreground hover:text-destructive" onClick={() => removeItem.mutate(item.id)} aria-label="Remove">
                  <Trash2 className="size-4" />
                </button>
              </Card>
            ))}
          </div>

          <Card className="flex h-fit flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">{t('marketplace.checkout')}</h2>
            <SummaryRow label={t('marketplace.subtotal')} value={formatMoney(cart.totals.subtotal)} />
            <SummaryRow label={t('marketplace.discount')} value={`-${formatMoney(cart.totals.discount)}`} />
            <SummaryRow label={t('marketplace.total')} value={formatMoney(cart.totals.total)} bold />
            <Button onClick={() => navigate('/checkout')} disabled={cart.issues.some((i) => i.code === 'INSUFFICIENT_STOCK')}>
              {t('marketplace.checkout')}
            </Button>
          </Card>
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
