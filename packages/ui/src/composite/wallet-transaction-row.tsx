import * as React from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { WalletTransactionDto } from '@ptg/types';
import { StatusBadge } from './status-badge.js';
import { cn } from '../lib/cn.js';

export interface WalletTransactionRowProps {
  transaction: WalletTransactionDto;
  formattedAmount: string;
  formattedDate: string;
  typeLabel: string;
  onClick?: () => void;
  className?: string;
}

export function WalletTransactionRow({
  transaction,
  formattedAmount,
  formattedDate,
  typeLabel,
  onClick,
  className,
}: WalletTransactionRowProps) {
  const isIn = transaction.direction === 'IN';
  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 border-b border-border py-2.5 last:border-0',
        onClick && 'cursor-pointer hover:bg-accent/50',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          isIn ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
        )}
      >
        {isIn ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{typeLabel}</span>
        <span className="text-2xs text-muted-foreground">{formattedDate}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className={cn('num text-sm font-semibold', isIn ? 'text-success' : 'text-foreground')}>
          {isIn ? '+' : '-'}
          {formattedAmount}
        </span>
        {transaction.status !== 'POSTED' ? <StatusBadge status={transaction.status} /> : null}
      </div>
    </div>
  );
}
