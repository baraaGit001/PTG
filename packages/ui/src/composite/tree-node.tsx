import * as React from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import type { MemberSummaryDto } from '@ptg/types';
import { StatusBadge } from './status-badge.js';
import { cn } from '../lib/cn.js';

export interface TreeNodeProps {
  member: MemberSummaryDto;
  depth: number;
  expanded: boolean;
  loading?: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onSelect?: () => void;
  className?: string;
}

/** One row of the sponsor/placement tree explorer. Children render recursively by the caller. */
export function TreeNode({
  member,
  depth,
  expanded,
  loading,
  hasChildren,
  onToggle,
  onSelect,
  className,
}: TreeNodeProps) {
  return (
    <div
      className={cn('flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-accent/50', className)}
      style={{ paddingLeft: `${depth * 1.25}rem` }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasChildren}
        aria-label={expanded ? 'Collapse' : 'Expand'}
        aria-expanded={expanded}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground',
          hasChildren ? 'hover:bg-accent' : 'invisible',
        )}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
        )}
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="truncate text-sm font-medium text-foreground">{member.displayName}</span>
        <span className="num shrink-0 text-2xs text-muted-foreground">{member.memberId}</span>
        {member.rank ? (
          <span className="shrink-0 text-2xs text-muted-foreground">· {member.rank}</span>
        ) : null}
        <StatusBadge status={member.membershipStatus} className="ml-auto shrink-0" />
      </button>
    </div>
  );
}
