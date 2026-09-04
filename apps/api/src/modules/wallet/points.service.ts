import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PointTransaction } from '@prisma/client';
import type { PointSummaryDto, PointTransactionDto, PointTransactionType, ReferenceType } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface PostPointsParams {
  userId: string;
  type: PointTransactionType;
  /** Signed integer: positive adds points, negative removes them. */
  points: number;
  description: string;
  descriptionCode?: string;
  referenceType?: ReferenceType;
  referenceId?: string;
  referenceLabel?: string;
  expiresAt?: Date;
  idempotencyKey: string;
}

/**
 * Personal Points ledger (packages/types PointTransaction). This is the only
 * place that ever changes a member's point balance - always by appending a
 * PointTransaction row, never by writing a bare counter. A mirrored
 * `Wallet(type=PERSONAL_POINTS)` row is kept in the same transaction purely
 * as a read cache so the generic wallet endpoints can list points alongside
 * E_ACCOUNT/BONUS_POOL without a second source of truth for the balance.
 */
@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string): Promise<PointSummaryDto> {
    const [balanceRow, earned, spent, expiringSoon] = await Promise.all([
      this.prisma.pointTransaction.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.pointTransaction.aggregate({ where: { userId, type: 'EARNED' }, _sum: { points: true } }),
      this.prisma.pointTransaction.aggregate({ where: { userId, type: 'SPENT' }, _sum: { points: true } }),
      this.prisma.pointTransaction.aggregate({
        where: { userId, expiresAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
        _sum: { points: true },
        orderBy: undefined,
      }),
    ]);
    const nextExpiry = await this.prisma.pointTransaction.findFirst({
      where: { userId, expiresAt: { gte: new Date() } },
      orderBy: { expiresAt: 'asc' },
    });

    return {
      balance: balanceRow?.balanceAfter ?? 0,
      earnedInPeriod: earned._sum.points ?? 0,
      spentInPeriod: Math.abs(spent._sum.points ?? 0),
      expiringSoon: Math.abs(expiringSoon._sum.points ?? 0),
      expiringSoonAt: nextExpiry?.expiresAt?.toISOString() ?? null,
    };
  }

  async listTransactions(
    userId: string,
    args: { skip: number; take: number; type?: PointTransactionType },
  ): Promise<{ items: PointTransactionDto[]; total: number }> {
    const where: Prisma.PointTransactionWhereInput = { userId, type: args.type };
    const [rows, total] = await Promise.all([
      this.prisma.pointTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: args.skip, take: args.take }),
      this.prisma.pointTransaction.count({ where }),
    ]);
    return { items: rows.map(toPointTransactionDto), total };
  }

  async post(params: PostPointsParams): Promise<PointTransactionDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.pointTransaction.findUnique({ where: { idempotencyKey: params.idempotencyKey } });
        if (existing) return toPointTransactionDto(existing);

        const last = await tx.pointTransaction.findFirst({ where: { userId: params.userId }, orderBy: { createdAt: 'desc' } });
        const currentBalance = last?.balanceAfter ?? 0;
        const newBalance = currentBalance + params.points;

        if (newBalance < 0) {
          throw new ApiException('INSUFFICIENT_POINTS', 'This member does not have enough points for this operation.');
        }

        const created = await tx.pointTransaction.create({
          data: {
            userId: params.userId,
            type: params.type,
            points: params.points,
            balanceAfter: newBalance,
            description: params.description,
            descriptionCode: params.descriptionCode,
            referenceType: params.referenceType,
            referenceId: params.referenceId,
            referenceLabel: params.referenceLabel,
            expiresAt: params.expiresAt,
            idempotencyKey: params.idempotencyKey,
          },
        });

        const wallet = await tx.wallet.upsert({
          where: { userId_type: { userId: params.userId, type: 'PERSONAL_POINTS' } },
          create: { userId: params.userId, type: 'PERSONAL_POINTS', currency: 'PTS', balanceMinor: BigInt(newBalance) },
          update: { balanceMinor: BigInt(newBalance) },
        });
        void wallet;

        return toPointTransactionDto(created);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 },
    );
  }
}

function toPointTransactionDto(row: PointTransaction): PointTransactionDto {
  return {
    id: row.id,
    type: row.type,
    points: row.points,
    balanceAfter: row.balanceAfter,
    description: row.description,
    descriptionCode: row.descriptionCode,
    reference: row.referenceType ? { type: row.referenceType, id: row.referenceId, label: row.referenceLabel } : null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
