import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Infra probes, deliberately mounted outside `/api/v1` (see main.ts) so they
 * never collide with the product's own `/health/*` feature routes and never
 * require authentication.
 */
@ApiExcludeController()
@Controller('health')
export class ObservabilityController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @HttpCode(200)
  root(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Public()
  @Get('live')
  @HttpCode(200)
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  async ready(): Promise<{ status: 'ok' | 'degraded' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      return { status: 'degraded' };
    }
  }
}
