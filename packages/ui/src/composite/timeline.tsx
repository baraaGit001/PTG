import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/cn.js';

export interface TimelineStep {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  state: 'complete' | 'current' | 'upcoming' | 'cancelled';
}

export interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

/** Vertical status timeline used for order tracking. */
export function Timeline({ steps, className }: TimelineProps) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast ? (
              <span
                className={cn(
                  'absolute left-[11px] top-6 h-full w-px',
                  step.state === 'complete' ? 'bg-primary' : 'bg-border',
                )}
                aria-hidden="true"
              />
            ) : null}
            <span
              className={cn(
                'z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-2xs font-medium',
                step.state === 'complete' && 'border-primary bg-primary text-primary-foreground',
                step.state === 'current' && 'border-primary bg-card text-primary',
                step.state === 'upcoming' && 'border-border bg-card text-muted-foreground',
                step.state === 'cancelled' && 'border-destructive bg-destructive text-destructive-foreground',
              )}
            >
              {step.state === 'complete' ? <Check className="size-3.5" /> : null}
            </span>
            <div className="flex flex-col pt-0.5">
              <span
                className={cn(
                  'text-sm font-medium',
                  step.state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {step.title}
              </span>
              {step.description ? <span className="text-2xs text-muted-foreground">{step.description}</span> : null}
              {step.timestamp ? <span className="text-2xs text-muted-foreground">{step.timestamp}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
