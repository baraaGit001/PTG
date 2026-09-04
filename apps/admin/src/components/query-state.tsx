import * as React from 'react';
import { EmptyState, ErrorState, LoadingSkeleton } from '@ptg/ui';
import { isApiClientError } from '@/lib/api-error';

export interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonVariant?: 'list' | 'card-grid' | 'table' | 'text' | 'detail';
  children: React.ReactNode;
}

export function QueryState({ isLoading, isError, error, onRetry, isEmpty, emptyTitle, emptyDescription, skeletonVariant = 'table', children }: QueryStateProps) {
  if (isLoading) return <LoadingSkeleton variant={skeletonVariant} />;
  if (isError) {
    return <ErrorState title="Something went wrong" description={isApiClientError(error) ? error.message : undefined} onRetry={onRetry} />;
  }
  if (isEmpty) return <EmptyState title={emptyTitle ?? 'No results'} description={emptyDescription} />;
  return <>{children}</>;
}
