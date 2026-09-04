import { HttpException } from '@nestjs/common';
import { ERROR_CODE_STATUS, type ApiErrorCode, type ApiErrorDetail } from '@ptg/types';

/**
 * The only exception type feature code should throw for an expected business
 * error. Carries a stable `code` from the shared catalogue so the frontend
 * never has to parse a free-text message to decide what happened.
 */
export class ApiException extends HttpException {
  public readonly code: ApiErrorCode;
  public readonly details?: ApiErrorDetail[];

  constructor(code: ApiErrorCode, message?: string, details?: ApiErrorDetail[], statusOverride?: number) {
    const status = statusOverride ?? ERROR_CODE_STATUS[code];
    super({ code, message: message ?? code }, status);
    this.code = code;
    this.details = details;
  }
}
