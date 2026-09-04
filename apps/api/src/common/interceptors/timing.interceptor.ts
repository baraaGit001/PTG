import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap } from 'rxjs';

/** Logs a structured timing line for every request and echoes it back as `Server-Timing`. */
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RequestTiming');

  intercept(context: ExecutionContext, next: CallHandler) {
    const start = process.hrtime.bigint();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        response.setHeader('Server-Timing', `app;dur=${durationMs.toFixed(1)}`);
        this.logger.log(
          JSON.stringify({ method: request.method, path: request.originalUrl, durationMs: Number(durationMs.toFixed(1)), requestId: request.headers['x-request-id'] }),
        );
      }),
    );
  }
}
