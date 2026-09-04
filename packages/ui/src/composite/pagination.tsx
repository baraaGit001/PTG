import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@ptg/types';
import { Button } from '../primitives/button.js';
import { cn } from '../lib/cn.js';

export interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
  /** i18n label, e.g. "{count} results" - pre-formatted by the caller. */
  summaryLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
}

export function Pagination({
  meta,
  onPageChange,
  className,
  summaryLabel,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: PaginationProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground', className)}>
      <span>{summaryLabel ?? `${meta.total} results`}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasPrevious}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="size-3.5" />
          {previousLabel}
        </Button>
        <span className="num px-2">
          {meta.page} / {Math.max(meta.totalPages, 1)}
        </span>
        <Button variant="outline" size="sm" disabled={!meta.hasNext} onClick={() => onPageChange(meta.page + 1)}>
          {nextLabel}
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
