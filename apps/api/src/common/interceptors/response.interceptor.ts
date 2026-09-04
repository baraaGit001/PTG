import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import { randomUUID } from 'node:crypto';
import type { ApiSuccess, PaginatedData, ResponseMeta } from '@ptg/types';

/**
 * Wraps every successful controller return value in the standard
 * `{ success: true, data, meta }` envelope. A handler that returns
 * `{ items, meta }` has `meta` promoted to the envelope's `meta.pagination`
 * automatically so list endpoints stay uniform without repeating boilerplate
 * in every controller method.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? randomUUID();

    return next.handle().pipe(
      map((result) => {
        const meta: ResponseMeta = { requestId };
        let data = result;

        if (result && typeof result === 'object' && 'items' in (result as object) && 'pagination' in (result as object)) {
          const paginatedResult = result as unknown as PaginatedData<unknown> & { pagination: ResponseMeta['pagination'] };
          meta.pagination = paginatedResult.pagination;
          data = paginatedResult.items as unknown as T;
        }

        return { success: true, data, meta };
      }),
    );
  }
}
