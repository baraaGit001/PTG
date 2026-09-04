import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../primitives/card.js';
import { cn } from '../lib/cn.js';

const ACCENT_CLASSES: Record<'green' | 'blue' | 'orange' | 'neutral', string> = {
  green: 'bg-success/10 text-success',
  blue: 'bg-info/10 text-info',
  orange: 'bg-warning/10 text-warning',
  neutral: 'bg-muted text-muted-foreground',
};

export interface BalanceCardProps {
  label: string;
  /** Pre-formatted, locale-aware amount string (see @ptg/types money.formatMoney). */
  formattedAmount: string;
  icon?: LucideIcon;
  accent?: 'green' | 'blue' | 'orange' | 'neutral';
  /** Pre-formatted delta string, e.g. "+3.2%"; caller decides sign/tone. */
  deltaLabel?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
  className?: string;
}

/** Balance tile used on the dashboard KPI row and the wallet overview. */
export function BalanceCard({
  label,
  formattedAmount,
  icon: Icon,
  accent = 'neutral',
  deltaLabel,
  deltaTone = 'neutral',
  onClick,
  className,
}: BalanceCardProps) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Card className={cn('p-4 text-left', onClick && 'transition-shadow hover:shadow-raised', className)}>
      <Comp onClick={onClick} className="flex w-full flex-col gap-3 text-left" type={onClick ? 'button' : undefined}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {Icon ? (
            <span className={cn('flex size-7 items-center justify-center rounded-full', ACCENT_CLASSES[accent])}>
              <Icon className="size-4" />
            </span>
          ) : null}
        </div>
        <span className="num text-xl font-semibold leading-none text-foreground">{formattedAmount}</span>
        {deltaLabel ? (
          <span
            className={cn(
              'num text-2xs',
              deltaTone === 'positive' && 'text-success',
              deltaTone === 'negative' && 'text-destructive',
              deltaTone === 'neutral' && 'text-muted-foreground',
            )}
          >
            {deltaLabel}
          </span>
        ) : null}
      </Comp>
    </Card>
  );
}

export interface MetricCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  accent?: 'green' | 'blue' | 'orange' | 'neutral';
  hint?: string;
  className?: string;
}

/** Generic count/metric tile (e.g. member counts, order counts). */
export function MetricCard({ label, value, icon: Icon, accent = 'neutral', hint, className }: MetricCardProps) {
  return (
    <Card className={cn('flex items-center gap-3 p-4', className)}>
      {Icon ? (
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', ACCENT_CLASSES[accent])}>
          <Icon className="size-4.5" />
        </span>
      ) : null}
      <div className="flex flex-col">
        <span className="num text-lg font-semibold leading-none text-foreground">{value}</span>
        <span className="text-2xs text-muted-foreground">{label}</span>
        {hint ? <span className="text-2xs text-muted-foreground">{hint}</span> : null}
      </div>
    </Card>
  );
}
