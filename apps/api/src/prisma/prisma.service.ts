import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around PrismaClient. Every module accesses the database
 * exclusively through this service (or `$transaction` on it) - no controller
 * or ad-hoc script talks to the database directly.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('warn', (event: unknown) => this.logger.warn(JSON.stringify(event)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('error', (event: unknown) => this.logger.error(JSON.stringify(event)));
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
