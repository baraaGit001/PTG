import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { CACHE_KEYS, CACHE_TTL_SECONDS, AUDIT_ACTIONS } from '@ptg/config';
import { SUPPORTED_LOCALES, type TranslationDto } from '@ptg/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { REDIS_CLIENT } from '../../redis/redis.module.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class LocalizationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly audit: AuditService,
  ) {}

  /** Full bundle for one locale, cached - what i18next loads per language at runtime. */
  async getBundle(locale: string): Promise<Record<string, Record<string, string>>> {
    const cached = await this.redis.get(CACHE_KEYS.translations(locale));
    if (cached) return JSON.parse(cached) as Record<string, Record<string, string>>;

    const rows = await this.prisma.translation.findMany({ where: { locale } });
    const bundle: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      bundle[row.namespace] ??= {};
      bundle[row.namespace][row.key] = row.value;
    }
    await this.redis.set(CACHE_KEYS.translations(locale), JSON.stringify(bundle), 'EX', CACHE_TTL_SECONDS.translations);
    return bundle;
  }

  async adminList(query: { locale?: string; namespace?: string; missingOnly?: boolean }): Promise<TranslationDto[]> {
    const rows = await this.prisma.translation.findMany({
      where: { locale: query.locale, namespace: query.namespace },
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
    });
    if (!query.missingOnly) return rows.map(toDto);

    const keysByNamespace = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!keysByNamespace.has(row.namespace)) keysByNamespace.set(row.namespace, new Set());
      keysByNamespace.get(row.namespace)!.add(row.key);
    }
    const missing: TranslationDto[] = [];
    for (const locale of SUPPORTED_LOCALES) {
      if (query.locale && locale !== query.locale) continue;
      for (const [namespace, keys] of keysByNamespace) {
        for (const key of keys) {
          const exists = rows.some((r) => r.locale === locale && r.namespace === namespace && r.key === key);
          if (!exists) missing.push({ id: `${locale}:${namespace}:${key}`, locale: locale as never, namespace, key, value: '', updatedAt: new Date().toISOString() });
        }
      }
    }
    return missing;
  }

  async upsert(actorId: string, input: { locale: string; namespace: string; key: string; value: string }): Promise<TranslationDto> {
    const row = await this.prisma.translation.upsert({
      where: { locale_namespace_key: { locale: input.locale, namespace: input.namespace, key: input.key } },
      create: input,
      update: { value: input.value },
    });
    await this.redis.del(CACHE_KEYS.translations(input.locale));
    await this.audit.record({ actorId, action: AUDIT_ACTIONS.translationUpdated, entityType: 'Translation', entityId: row.id, after: input });
    return toDto(row);
  }
}

function toDto(row: { id: string; locale: string; namespace: string; key: string; value: string; updatedAt: Date }): TranslationDto {
  return { id: row.id, locale: row.locale as TranslationDto['locale'], namespace: row.namespace, key: row.key, value: row.value, updatedAt: row.updatedAt.toISOString() };
}
