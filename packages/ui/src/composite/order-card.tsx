import * as React from 'react';
import { ChevronRight, ImageOff } from 'lucide-react';
import type { OrderSummaryDto } from '@ptg/types';
import { Card } from '../primitives/card.js';
import { StatusBadge } from './status-badge.js';
import { cn } from '../lib/cn.js';

export interface OrderCardProps {
  order: OrderSummaryDto;
  formattedTotal: string;
  formattedDate: string;
  statusLabel?: string;
  itemCountLabel: string;
  onClick?: () => void;
  className?: string;
}

export function OrderCard({
  order,
  formattedTotal,
  formattedDate,
  statusLabel,
  itemCountLabel,
  onClick,
  className,
}: OrderCardProps) {
  return (
    <Card
      className={cn('flex items-center gap-3 p-3', onClick && 'cursor-pointer transition-shadow hover:shadow-raised', className)}
      onClick={onClick}
    >
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {order.primaryImageUrl ? (
          <img src={order.primaryImageUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <ImageOff className="size-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">#{order.orderNumber}</span>
          <StatusBadge status={order.status} label={statusLabel} />
        </div>
        <span className="text-2xs text-muted-foreground">
          {formattedDate} · {itemCountLabel}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="num text-sm font-semibold text-foreground">{formattedTotal}</span>
        {onClick ? <ChevronRight className="size-4 text-muted-foreground" /> : null}
      </div>
    </Card>
  );
}
