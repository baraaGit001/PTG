import type { CanActivate, ExecutionContext} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiException } from '../errors/api.exception.js';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators.js';
import type { RequestUser } from '../types/request-user.js';
import { RbacService } from '../../modules/rbac/rbac.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AppConfig } from '../../config/configuration.js';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

/**
 * Verifies the access token, confirms the session is still live, and
 * attaches a fully-resolved `RequestUser` (identity + live roles/permissions)
 * to the request. Every non-@Public() route depends on this having run.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const token = this.extractToken(request);

    if (!token) {
      if (isPublic) return true;
      throw new ApiException('UNAUTHENTICATED', 'Authentication is required.');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('auth', { infer: true }).accessSecret,
      });
    } catch {
      if (isPublic) return true;
      throw new ApiException('TOKEN_INVALID', 'The access token is invalid or has expired.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      if (isPublic) return true;
      throw new ApiException('UNAUTHENTICATED', 'The account is no longer active.');
    }

    const { roles, permissions } = await this.rbac.resolveForUser(user.id);
    request.user = {
      id: user.id,
      memberId: user.memberId,
      status: user.status,
      sessionId: payload.sid,
      roles,
      permissions,
    };

    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}
