import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuditLogDto } from '@ptg/types';
import { RequirePermissions } from '../../common/decorators/auth.decorators.js';
import { PaginationQueryDto, buildPaginationMeta, paginationArgs, dateRangeFilter, type PaginatedResult } from '../../common/dto/pagination.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IsOptional, IsString } from 'class-validator';

class AuditLogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;
}

@ApiTags('admin/audit-logs')
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('audit.read')
  async list(@Query() query: AuditLogQueryDto): Promise<PaginatedResult<AuditLogDto>> {
    const where = {
      actorId: query.actorId,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      createdAt: dateRangeFilter(query.from, query.to),
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(query),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items: AuditLogDto[] = rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      actorName: row.actor?.fullName ?? null,
      actorRole: row.actorRole,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      before: row.before as Record<string, unknown> | null,
      after: row.after as Record<string, unknown> | null,
      metadata: row.metadata as Record<string, unknown> | null,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
    }));

    return { items, pagination: buildPaginationMeta(query, total) };
  }
}
