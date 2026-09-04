import { Body, Controller, Delete, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { LoginResponse, RefreshResponse, SessionSummary } from '@ptg/types';
import { Public, CurrentUser } from '../../common/decorators/auth.decorators.js';
import { ApiException } from '../../common/errors/api.exception.js';
import type { RequestUser } from '../../common/types/request-user.js';
import type { AppConfig } from '../../config/configuration.js';
import { AuthService} from './auth.service.js';
import { type RequestMeta } from './auth.service.js';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, LogoutDto, ResetPasswordDto } from './auth.dto.js';

const REFRESH_COOKIE = 'ptg_refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  private requestMeta(req: Request): RequestMeta {
    return { ipAddress: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
  }

  private setRefreshCookie(res: Response, token: string, maxAgeMs: number): void {
    const auth = this.config.get('auth', { infer: true });
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: auth.cookieSecure,
      sameSite: 'strict',
      domain: auth.cookieDomain,
      path: '/api/v1/auth',
      maxAge: maxAgeMs,
    });
  }

  private clearRefreshCookie(res: Response): void {
    const auth = this.config.get('auth', { infer: true });
    res.clearCookie(REFRESH_COOKIE, { domain: auth.cookieDomain, path: '/api/v1/auth' });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const result = await this.authService.login(
      dto.memberId,
      dto.password,
      Boolean(dto.rememberMe),
      dto.locale,
      this.requestMeta(req),
    );
    const auth = this.config.get('auth', { infer: true });
    const maxAgeMs = dto.rememberMe ? auth.refreshTtlSeconds * 1000 : 24 * 60 * 60 * 1000;
    if (result.tokens.refreshToken) {
      this.setRefreshCookie(res, result.tokens.refreshToken, maxAgeMs);
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponse> {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!cookieToken) {
      throw new ApiException('TOKEN_INVALID', 'No refresh token was supplied.');
    }
    const result = await this.authService.refresh(cookieToken, this.requestMeta(req));
    this.setRefreshCookie(res, result.tokens.refreshToken ?? cookieToken, 24 * 60 * 60 * 1000);
    return result;
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: RequestUser,
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.authService.logout(user.id, user.sessionId, Boolean(dto.allSessions), this.requestMeta(req));
    this.clearRefreshCookie(res);
    return { ok: true };
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword, this.requestMeta(req));
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ ok: true }> {
    await this.authService.forgotPassword(dto.memberId);
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { ok: true };
  }

  @Get('sessions')
  async listSessions(@CurrentUser() user: RequestUser): Promise<SessionSummary[]> {
    return this.authService.listSessions(user.id, user.sessionId);
  }

  @Delete('sessions/:id')
  async revokeSession(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.authService.revokeOwnSession(user.id, id);
    return { ok: true };
  }
}
