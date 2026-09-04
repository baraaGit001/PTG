import type { ApiErrorCode } from './error-codes.js';

/** Pagination metadata attached to every list response. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  requestId?: string;
  [key: string]: unknown;
}

export interface ApiSuccess<TData> {
  success: true;
  data: TData;
  meta?: ResponseMeta;
}

export interface ApiErrorDetail {
  /** Dot-path of the offending field, when the error is a validation error. */
  field?: string;
  code?: string;
  message: string;
}

export interface ApiErrorBody {
  code: ApiErrorCode;
  /** Human-readable fallback. Clients must branch on `code`, never on `message`. */
  message: string;
  details?: ApiErrorDetail[];
  /** Correlates a client-visible failure with the server log entry. */
  errorId?: string;
  requestId?: string;
}

export interface ApiError {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiError;

export interface PaginatedData<TItem> {
  items: TItem[];
}

/** Query parameters shared by every paginated collection endpoint. */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface SortQuery {
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  /** ISO-8601 date-time, inclusive. */
  from?: string;
  /** ISO-8601 date-time, exclusive. */
  to?: string;
}

export interface SearchQuery {
  search?: string;
}

export type ListQuery = PaginationQuery & SortQuery & DateRangeQuery & SearchQuery;
