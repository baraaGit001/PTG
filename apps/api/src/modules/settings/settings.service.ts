import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import type { Prisma } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL_SECONDS, SETTING_KEYS } from '@ptg/config';
import type { PublicSettingsDto, SystemSettingDto } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { REDIS_CLIENT } from '../../redis/redis.module.js';
import { AuditService } from '../audit/audit.service.js';
import { AUDIT_ACTIONS } from '@ptg/config';

/**
 * Every admin-configurable behaviour mentioned in the brief (approval
 * thresholds, negative-balance policy, dashboard KPI layout, points expiry,
 * ...) is read from here rather than hard-coded, so it can be changed at
 * runtime without a deploy.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly audit: AuditService,
  ) {}

  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!row) return fallback;
    return row.value as T;
  }

  async getPublicSettings(): Promise<PublicSettingsDto> {
    const cached = await this.redis.get(CACHE_KEYS.publicSettings);
    if (cached) return JSON.parse(cached) as PublicSettingsDto;

    const rows = await this.prisma.systemSetting.findMany({ where: { isPublic: true } });
    const map = new Map(rows.map((row) => [row.key, row.value]));

    const settings: PublicSettingsDto = {
      brandName: (map.get(SETTING_KEYS.brandName) as string) ?? 'PTG Business',
      brandLogoUrl: (map.get(SETTING_KEYS.brandLogoUrl) as string) ?? null,
      defaultCurrency: (map.get(SETTING_KEYS.defaultCurrency) as string) ?? 'USD',
      defaultLocale: ((map.get(SETTING_KEYS.defaultLocale) as string) ?? 'en') as PublicSettingsDto['defaultLocale'],
      supportedLocales: (map.get(SETTING_KEYS.supportedLocales) as PublicSettingsDto['supportedLocales']) ?? ['en'],
      demoMode: (map.get(SETTING_KEYS.demoMode) as boolean) ?? true,
      guestBrowsingEnabled: (map.get(SETTING_KEYS.guestBrowsingEnabled) as boolean) ?? true,
      registrationEnabled: (map.get(SETTING_KEYS.registrationEnabled) as boolean) ?? false,
      dashboardKpis: (map.get(SETTING_KEYS.dashboardKpis) as unknown as PublicSettingsDto['dashboardKpis']) ?? [],
    };

    await this.redis.set(CACHE_KEYS.publicSettings, JSON.stringify(settings), 'EX', CACHE_TTL_SECONDS.publicSettings);
    return settings;
  }

  async adminList(): Promise<SystemSettingDto[]> {
    const rows = await this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
    return rows.map((row) => ({
      key: row.key,
      value: row.value,
      isPublic: row.isPublic,
      description: row.description,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async adminUpdate(actorId: string, key: string, value: unknown): Promise<SystemSettingDto> {
    const before = await this.prisma.systemSetting.findUnique({ where: { key } });
    const row = await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue, isPublic: before?.isPublic ?? false },
      update: { value: value as Prisma.InputJsonValue },
    });
    await this.redis.del(CACHE_KEYS.publicSettings);
    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.settingUpdated,
      entityType: 'SystemSetting',
      entityId: key,
      before: { value: before?.value ?? null },
      after: { value },
    });
    return { key: row.key, value: row.value, isPublic: row.isPublic, description: row.description, updatedAt: row.updatedAt.toISOString() };
  }

  async requireBoolean(key: string, fallback: boolean): Promise<boolean> {
    const value = await this.get<boolean | null>(key, null);
    return typeof value === 'boolean' ? value : fallback;
  }

  async requireNumber(key: string, fallback: number): Promise<number> {
    const value = await this.get<number | null>(key, null);
    return typeof value === 'number' ? value : fallback;
  }

  assertKeyKnown(key: string): void {
    if (!Object.values(SETTING_KEYS).includes(key as never)) {
      throw new ApiException('SETTING_NOT_FOUND', `Unknown setting key: ${key}`);
    }
  }
}
