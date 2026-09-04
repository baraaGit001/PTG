import type { CanActivate, ExecutionContext} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { hasAllPermissions, type PermissionName } from '@ptg/types';
import { ApiException } from '../errors/api.exception.js';
import { PERMISSIONS_KEY } from '../decorators/auth.decorators.js';
import type { RequestUser } from '../types/request-user.js';

/**
 * Enforces `@RequirePermissions(...)`. Runs after JwtAuthGuard, which is why
 * both are registered globally in that order (see app.module.ts). A route
 * with no declared permissions is allowed for any authenticated user -
 * fine-grained restriction is opt-in and explicit.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionName[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const user = request.user;
    if (!user) {
      throw new ApiException('UNAUTHENTICATED', 'Authentication is required.');
    }
    if (!hasAllPermissions(user.permissions, required)) {
      throw new ApiException('FORBIDDEN', 'You do not have permission to perform this action.');
    }
    return true;
  }
}
