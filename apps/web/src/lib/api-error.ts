import type { ApiErrorBody, ApiErrorCode } from '@ptg/types';

/** Thrown by the API client for every non-2xx response. Callers branch on `.code`, never on `.message`. */
export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: ApiErrorBody['details'];
  readonly requestId?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiClientError';
    this.code = body.code;
    this.status = status;
    this.details = body.details;
    this.requestId = body.requestId;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
