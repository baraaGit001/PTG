import type {
  ArgumentsHost,
  ExceptionFilter} from '@nestjs/common';
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { ApiError, ApiErrorDetail } from '@ptg/types';
import { ApiException } from '../errors/api.exception.js';

interface ValidationExceptionResponse {
  message: string[] | string;
  error?: string;
}

/**
 * Every uncaught throw in the application passes through here and comes out
 * as the standard `{ success: false, error: { code, message } }` envelope.
 * Unexpected errors are logged with an `errorId` that is also handed back to
 * the client, so a bug report can be matched to a server log line without
 * ever leaking a stack trace to the browser.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? randomUUID();

    if (exception instanceof ApiException) {
      const status = exception.getStatus();
      const body: ApiError = {
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          requestId,
        },
      };
      response.status(status).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const details = this.extractValidationDetails(payload);
      const body: ApiError = {
        success: false,
        error: {
          code: status === HttpStatus.UNPROCESSABLE_ENTITY || details ? 'VALIDATION_ERROR' : 'BAD_REQUEST',
          message: typeof payload === 'string' ? payload : exception.message,
          details,
          requestId,
        },
      };
      response.status(status).json(body);
      return;
    }

    const errorId = randomUUID();
    this.logger.error(
      `Unhandled exception [errorId=${errorId}] [requestId=${requestId}] ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    const body: ApiError = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        errorId,
        requestId,
      },
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }

  private extractValidationDetails(payload: unknown): ApiErrorDetail[] | undefined {
    if (!payload || typeof payload !== 'object') return undefined;
    const candidate = payload as ValidationExceptionResponse;
    if (!Array.isArray(candidate.message)) return undefined;
    return candidate.message.map((message) => ({ message }));
  }
}
