import type { PermissionName, RoleName } from '@ptg/types';

/**
 * The authenticated principal attached to `req.user` by JwtAuthGuard. Roles
 * and permissions are always resolved fresh from the database (via
 * RbacService, short-cached) - never trusted from the JWT payload itself, so
 * a role change or account suspension takes effect on the next request.
 */
export interface RequestUser {
  id: string;
  memberId: string;
  status: string;
  sessionId: string;
  roles: RoleName[];
  permissions: PermissionName[];
}
