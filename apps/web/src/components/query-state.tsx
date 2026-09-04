import * as React from 'react';
import { useTranslation } from 'react-i18next';
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

/** Standard loading -> error -> empty -> success wrapper every server-driven view uses. */
export function QueryState({ isLoading, isError, error, onRetry, isEmpty, emptyTitle, emptyDescription, skeletonVariant = 'list', children }: QueryStateProps) {
  const { t } = useTranslation();

  if (isLoading) return <LoadingSkeleton variant={skeletonVariant} />;

  if (isError) {
    const message = isApiClientError(error) ? error.message : t('errors.generic');
    return <ErrorState title={t('errors.generic')} description={message} onRetry={onRetry} retryLabel={t('common.retry')} />;
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle ?? t('errors.notFound')} description={emptyDescription} />;
  }

  return <>{children}</>;
}
