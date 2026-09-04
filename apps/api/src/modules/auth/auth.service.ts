import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, randomBytes } from 'node:crypto';
import { AUDIT_ACTIONS } from '@ptg/config';
import type { AuthTokens, AuthenticatedUser, LoginResponse, RefreshResponse, SessionSummary } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import type { AppConfig } from '../../config/configuration.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import { toAuthenticatedUser } from '../users/user.mapper.js';

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const SHORT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 day when "remember me" is off

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async login(
    memberId: string,
    plainPassword: string,
    rememberMe: boolean,
    locale: string | undefined,
    meta: RequestMeta,
  ): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { memberId }, include: { partnerProfile: true } });
    const loginConfig = this.config.get('login', { infer: true });

    if (!user) {
      await this.audit.record({
        actorId: null,
        action: AUDIT_ACTIONS.loginFailed,
        entityType: 'User',
        metadata: { memberId, reason: 'not_found' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new ApiException('INVALID_CREDENTIALS', 'Invalid member ID or password.');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await this.audit.record({
        actorId: user.id,
        action: AUDIT_ACTIONS.loginFailed,
        entityType: 'User',
        entityId: user.id,
        metadata: { reason: 'locked' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new ApiException('ACCOUNT_LOCKED', 'This account is temporarily locked. Try again later.');
    }

    if (user.status === 'SUSPENDED' || user.status === 'CLOSED') {
      throw new ApiException('ACCOUNT_DISABLED', 'This account has been disabled.');
    }
    if (user.status === 'PENDING') {
      throw new ApiException('ACCOUNT_PENDING_ACTIVATION', 'This account has not been activated yet.');
    }

    const passwordValid = await this.password.verify(user.passwordHash, plainPassword);
    if (!passwordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= loginConfig.maxAttempts
        ? new Date(Date.now() + loginConfig.lockMinutes * 60 * 1000)
        : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockedUntil },
      });
      await this.audit.record({
        actorId: user.id,
        action: AUDIT_ACTIONS.loginFailed,
        entityType: 'User',
        entityId: user.id,
        metadata: { reason: 'bad_password', attempts, locked: Boolean(lockedUntil) },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new ApiException('INVALID_CREDENTIALS', 'Invalid member ID or password.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        ...(locale ? { locale } : {}),
      },
    });

    const auth = this.config.get('auth', { infer: true });
    const sessionTtlMs = rememberMe ? auth.refreshTtlSeconds * 1000 : SHORT_SESSION_TTL_MS;
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        rememberMe,
        expiresAt: new Date(Date.now() + sessionTtlMs),
      },
    });

    const refreshTokenId = randomUUID();
    const { raw, secret } = this.tokens.generateRefreshSecret(refreshTokenId);
    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        sessionId: session.id,
        tokenHash: await this.password.hash(secret),
        expiresAt: session.expiresAt,
      },
    });

    const { token: accessToken, expiresIn } = await this.tokens.signAccessToken(user.id, session.id);
    const { roles, permissions } = await this.rbac.resolveForUser(user.id);
    const sponsorMemberId = await this.getSponsorMemberId(user.id);

    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.loginSucceeded,
      entityType: 'User',
      entityId: user.id,
      metadata: { sessionId: session.id, rememberMe },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    const authenticatedUser: AuthenticatedUser = toAuthenticatedUser({
      user,
      partnerProfile: user.partnerProfile,
      sponsorMemberId,
      roles,
      permissions,
    });

    const authTokens: AuthTokens = { accessToken, expiresIn, tokenType: 'Bearer', refreshToken: raw };
    return { user: authenticatedUser, tokens: authTokens, sessionId: session.id };
  }

  async refresh(rawToken: string, meta: RequestMeta): Promise<RefreshResponse> {
    const parsed = this.tokens.parseRefreshToken(rawToken);
    if (!parsed) throw new ApiException('TOKEN_INVALID', 'The refresh token is malformed.');

    const existing = await this.prisma.refreshToken.findUnique({
      where: { id: parsed.tokenRowId },
      include: { session: true },
    });
    if (!existing) throw new ApiException('TOKEN_INVALID', 'The refresh token is invalid.');

    if (existing.revokedAt) {
      // A previously-rotated token was presented again: treat the whole
      // session as compromised and force re-authentication everywhere.
      await this.revokeSessionInternal(existing.sessionId, 'refresh_token_reuse_detected');
      await this.audit.record({
        actorId: existing.session.userId,
        action: AUDIT_ACTIONS.refreshTokenReuse,
        entityType: 'Session',
        entityId: existing.sessionId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      this.logger.warn(`Refresh token reuse detected for session ${existing.sessionId}`);
      throw new ApiException('REFRESH_TOKEN_REUSED', 'This session has been invalidated for your security.');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new ApiException('TOKEN_EXPIRED', 'The refresh token has expired.');
    }

    const secretValid = await this.password.verify(existing.tokenHash, parsed.secret);
    if (!secretValid) {
      throw new ApiException('TOKEN_INVALID', 'The refresh token is invalid.');
    }

    const session = existing.session;
    if (session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new ApiException('SESSION_NOT_FOUND', 'This session is no longer active.');
    }

    const newTokenId = randomUUID();
    const { raw, secret } = this.tokens.generateRefreshSecret(newTokenId);

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          id: newTokenId,
          sessionId: session.id,
          tokenHash: await this.password.hash(secret),
          expiresAt: session.expiresAt,
        },
      }),
      this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date(), replacedByTokenId: newTokenId },
      }),
      this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }),
    ]);

    const { token: accessToken, expiresIn } = await this.tokens.signAccessToken(session.userId, session.id);

    await this.audit.record({
      actorId: session.userId,
      action: AUDIT_ACTIONS.tokenRefreshed,
      entityType: 'Session',
      entityId: session.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      tokens: { accessToken, expiresIn, tokenType: 'Bearer', refreshToken: raw },
      sessionId: session.id,
    };
  }

  async logout(userId: string, sessionId: string, allSessions: boolean, meta: RequestMeta): Promise<void> {
    if (allSessions) {
      await this.revokeAllSessions(userId, 'logout_all');
    } else {
      await this.revokeSessionInternal(sessionId, 'logout');
    }
    await this.audit.record({
      actorId: userId,
      action: AUDIT_ACTIONS.logout,
      entityType: 'Session',
      entityId: allSessions ? null : sessionId,
      metadata: { allSessions },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, meta: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await this.password.verify(user.passwordHash, currentPassword);
    if (!valid) throw new ApiException('CURRENT_PASSWORD_MISMATCH', 'The current password is incorrect.');

    this.password.assertPolicy(newPassword);
    const passwordHash = await this.password.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.revokeAllSessions(userId, 'password_changed');

    await this.audit.record({
      actorId: userId,
      action: AUDIT_ACTIONS.passwordChanged,
      entityType: 'User',
      entityId: userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  async forgotPassword(memberId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { memberId } });
    // Always behave the same way regardless of whether the account exists,
    // so this endpoint cannot be used to enumerate valid member IDs.
    if (!user) return;

    const tokenId = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash: await this.password.hash(secret),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const rawToken = `${tokenId}.${secret}`;
    if (this.config.get('env', { infer: true }) !== 'production') {
      // Development convenience only: no transactional email provider is
      // wired up yet (see docs/DEVELOPMENT.md). Never logged in production.
      this.logger.debug(`Password reset token for ${memberId}: ${rawToken}`);
    }
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const separatorIndex = rawToken.indexOf('.');
    if (separatorIndex <= 0) throw new ApiException('RESET_TOKEN_INVALID', 'The reset token is invalid.');
    const tokenId = rawToken.slice(0, separatorIndex);
    const secret = rawToken.slice(separatorIndex + 1);

    const record = await this.prisma.passwordResetToken.findUnique({ where: { id: tokenId } });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new ApiException('RESET_TOKEN_INVALID', 'The reset token is invalid or has expired.');
    }
    const valid = await this.password.verify(record.tokenHash, secret);
    if (!valid) throw new ApiException('RESET_TOKEN_INVALID', 'The reset token is invalid.');

    this.password.assertPolicy(newPassword);
    const passwordHash = await this.password.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    await this.revokeAllSessions(record.userId, 'password_reset');

    await this.audit.record({
      actorId: record.userId,
      action: AUDIT_ACTIONS.passwordReset,
      entityType: 'User',
      entityId: record.userId,
    });
  }

  async listSessions(userId: string, currentSessionId: string): Promise<SessionSummary[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      current: s.id === currentSessionId,
    }));
  }

  async revokeOwnSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw new ApiException('SESSION_NOT_FOUND', 'Session not found.');
    }
    await this.revokeSessionInternal(sessionId, 'revoked_by_user');
  }

  private async getSponsorMemberId(userId: string): Promise<string | null> {
    const relationship = await this.prisma.sponsorRelationship.findUnique({
      where: { memberId: userId },
      include: { sponsor: { select: { memberId: true } } },
    });
    return relationship?.sponsor?.memberId ?? null;
  }

  private async revokeSessionInternal(sessionId: string, reason: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date(), revokedReason: reason } }),
      this.prisma.refreshToken.updateMany({ where: { sessionId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  private async revokeAllSessions(userId: string, reason: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({ where: { userId, revokedAt: null }, select: { id: true } });
    await this.prisma.$transaction([
      this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId: { in: sessions.map((s) => s.id) }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
