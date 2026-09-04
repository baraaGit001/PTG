import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AUDIT_ACTIONS } from '@ptg/config';
import type { PromotionDto, PromotionInput } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { buildPaginationMeta, type PaginatedResult, type PaginationQueryDto } from '../../common/dto/pagination.dto.js';

/** Region-scoped marketing/community promotions. No region-specific business logic is hard-coded here. */
@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listActive(region?: string): Promise<PromotionDto[]> {
    const now = new Date();
    const rows = await this.prisma.promotion.findMany({
      where: {
        status: 'ACTIVE',
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gte: now } }],
        ...(region ? { OR: [{ regions: { isEmpty: true } }, { regions: { has: region } }] } : {}),
      },
      orderBy: { position: 'asc' },
    });
    return rows.map(toDto);
  }

  async adminList(query: PaginationQueryDto & { status?: string; region?: string }): Promise<PaginatedResult<PromotionDto>> {
    const where: Prisma.PromotionWhereInput = { status: query.status as never, regions: query.region ? { has: query.region } : undefined };
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
    const [rows, total] = await Promise.all([
      this.prisma.promotion.findMany({ where, orderBy: { position: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.promotion.count({ where }),
    ]);
    return { items: rows.map(toDto), pagination: buildPaginationMeta({ page, pageSize }, total) };
  }

  async create(actorId: string, input: PromotionInput): Promise<PromotionDto> {
    const promotion = await this.prisma.promotion.create({
      data: {
        title: input.title,
        description: input.description,
        imageUrl: input.imageUrl,
        regions: input.regions ?? [],
        status: input.status,
        startAt: new Date(input.startAt),
        endAt: input.endAt ? new Date(input.endAt) : null,
        linkPath: input.linkPath,
        rules: (input.rules ?? {}) as Prisma.InputJsonValue,
        position: input.position ?? 0,
      },
    });
    await this.audit.record({ actorId, action: AUDIT_ACTIONS.promotionUpdated, entityType: 'Promotion', entityId: promotion.id, after: input });
    return toDto(promotion);
  }

  async update(actorId: string, id: string, input: Partial<PromotionInput>): Promise<PromotionDto> {
    const before = await this.prisma.promotion.findUnique({ where: { id } });
    if (!before) throw new ApiException('PROMOTION_NOT_FOUND', 'Promotion not found.');
    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        imageUrl: input.imageUrl,
        regions: input.regions,
        status: input.status,
        startAt: input.startAt ? new Date(input.startAt) : undefined,
        endAt: input.endAt === null ? null : input.endAt ? new Date(input.endAt) : undefined,
        linkPath: input.linkPath,
        rules: input.rules as Prisma.InputJsonValue | undefined,
        position: input.position,
      },
    });
    await this.audit.record({ actorId, action: AUDIT_ACTIONS.promotionUpdated, entityType: 'Promotion', entityId: id, before: { status: before.status }, after: { status: promotion.status } });
    return toDto(promotion);
  }
}

function toDto(promotion: {
  id: string; title: string; description: string | null; imageUrl: string | null; regions: string[]; status: string; startAt: Date; endAt: Date | null; linkPath: string | null; rules: Prisma.JsonValue; position: number;
}): PromotionDto {
  return {
    id: promotion.id,
    title: promotion.title,
    description: promotion.description,
    imageUrl: promotion.imageUrl,
    regions: promotion.regions,
    status: promotion.status as PromotionDto['status'],
    startAt: promotion.startAt.toISOString(),
    endAt: promotion.endAt?.toISOString() ?? null,
    linkPath: promotion.linkPath,
    rules: (promotion.rules as Record<string, unknown>) ?? {},
    position: promotion.position,
  };
}
