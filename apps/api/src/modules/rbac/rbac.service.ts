import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { DEFAULT_ROLE_PERMISSIONS, type PermissionName, type RoleName } from '@ptg/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { REDIS_CLIENT } from '../../redis/redis.module.js';

interface ResolvedAccess {
  roles: RoleName[];
  permissions: PermissionName[];
}

const CACHE_TTL_SECONDS = 30;

/**
 * The single source of truth for "what can this user do". Guards never read
 * roles/permissions from a JWT claim - they always come through here, which
 * reads the live RolePermission table (short-cached in Redis) so a role
 * change or permission edit takes effect within seconds, not at next login.
 */
@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private cacheKey(userId: string): string {
    return `rbac:user:${userId}`;
  }

  async resolveForUser(userId: string): Promise<ResolvedAccess> {
    const cached = await this.redis.get(this.cacheKey(userId));
    if (cached) {
      return JSON.parse(cached) as ResolvedAccess;
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const roles = userRoles.map((ur) => ur.role.name);
    const permissionSet = new Set<PermissionName>();
    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        permissionSet.add(rp.permission.key as PermissionName);
      }
      // Seed defaults for roles that have no explicit RolePermission rows yet
      // (e.g. freshly seeded database before an admin customises the matrix).
      if (ur.role.permissions.length === 0) {
        for (const permission of DEFAULT_ROLE_PERMISSIONS[ur.role.name] ?? []) {
          permissionSet.add(permission);
        }
      }
    }

    const resolved: ResolvedAccess = { roles, permissions: [...permissionSet] };
    await this.redis.set(this.cacheKey(userId), JSON.stringify(resolved), 'EX', CACHE_TTL_SECONDS);
    return resolved;
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.del(this.cacheKey(userId));
  }
}
