import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuditAction } from '@ptg/config';
import type { RoleName } from '@ptg/types';
import { PrismaService } from '../../prisma/prisma.service.js';

export type DbClient = PrismaService | Prisma.TransactionClient;

export interface RecordAuditParams {
  actorId: string | null;
  actorRole?: RoleName | null;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Every sensitive mutation writes exactly one AuditLog row through this
 * service (see docs/SECURITY.md for the enforced list). Accepts an optional
 * Prisma transaction client so the audit row commits atomically with the
 * mutation it describes - never partially.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditParams, client: DbClient = this.prisma): Promise<void> {
    await client.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        before: (params.before ?? undefined) as Prisma.InputJsonValue,
        after: (params.after ?? undefined) as Prisma.InputJsonValue,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }
}
