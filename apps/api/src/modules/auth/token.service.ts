import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import type { AppConfig } from '../../config/configuration.js';
import type { AccessTokenPayload } from '../../common/guards/jwt-auth.guard.js';

export interface RefreshSecret {
  /** Opaque token handed to the client: `${refreshTokenRowId}.${secret}`. */
  raw: string;
  secret: string;
}

/** Pure token helpers - no database access, easy to unit test in isolation. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async signAccessToken(userId: string, sessionId: string): Promise<{ token: string; expiresIn: number }> {
    const auth = this.config.get('auth', { infer: true });
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId };
    const token = await this.jwtService.signAsync(payload, {
      secret: auth.accessSecret,
      expiresIn: auth.accessTtlSeconds,
    });
    return { token, expiresIn: auth.accessTtlSeconds };
  }

  generateRefreshSecret(tokenRowId: string): RefreshSecret {
    const secret = randomBytes(32).toString('base64url');
    return { raw: `${tokenRowId}.${secret}`, secret };
  }

  parseRefreshToken(raw: string): { tokenRowId: string; secret: string } | null {
    const index = raw.indexOf('.');
    if (index <= 0) return null;
    return { tokenRowId: raw.slice(0, index), secret: raw.slice(index + 1) };
  }
}
