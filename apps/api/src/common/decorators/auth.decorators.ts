import type { ExecutionContext} from '@nestjs/common';
import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { PermissionName } from '@ptg/types';
import type { RequestUser } from '../types/request-user.js';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marks a route as reachable without a valid access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'requiredPermissions';
/** Declares the permissions PermissionsGuard must find on the caller. All are required (AND). */
export const RequirePermissions = (...permissions: PermissionName[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Injects the authenticated user resolved by JwtAuthGuard. Throws is never needed - the guard already rejected anonymous requests on protected routes. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestUser | undefined => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: RequestUser }>();
  return request.user;
});
