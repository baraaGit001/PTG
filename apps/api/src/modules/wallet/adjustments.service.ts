import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AUDIT_ACTIONS, SETTING_KEYS } from '@ptg/config';
import type { WalletAdjustmentRequestDto } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { toMinorBigInt, toMoney } from '../../common/money.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { WalletLedgerService} from './wallet-ledger.service.js';
import { type PostTransactionParams } from './wallet-ledger.service.js';
import type { CreateWalletAdjustmentRequest } from '@ptg/types';

/**
 * Admin-initiated wallet mutations. Every request is mandatory-reasoned and
 * audited; whether it also requires a second admin's approval before the
 * ledger is touched is controlled by SystemSetting (see SETTING_KEYS.wallet*),
 * never hard-coded - this is the "approval workflow where configured" and
 * "never allow silent financial mutation" requirement.
 */
@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: WalletLedgerService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async request(actorId: string, dto: CreateWalletAdjustmentRequest): Promise<WalletAdjustmentRequestDto> {
    if (!dto.reason?.trim()) {
      throw new ApiException('ADJUSTMENT_REASON_REQUIRED', 'A reason is required for every wallet adjustment.');
    }

    const existing = await this.prisma.walletAdjustmentRequest.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) return this.getDtoById(existing.id);

    const wallet = await this.ledger.getOrCreateWallet(dto.userId, dto.walletType, dto.currency);

    const approvalRequired = await this.settings.requireBoolean(SETTING_KEYS.walletAdjustmentApprovalRequired, true);
    const threshold = await this.settings.requireNumber(SETTING_KEYS.walletAdjustmentApprovalThresholdMinor, 0);
    const needsApproval = approvalRequired && dto.amountMinor >= threshold;

    const request = await this.prisma.walletAdjustmentRequest.create({
      data: {
        walletId: wallet.id,
        amountMinor: toMinorBigInt(dto.amountMinor),
        currency: dto.currency,
        direction: dto.direction,
        reason: dto.reason,
        requestedById: actorId,
        idempotencyKey: dto.idempotencyKey,
        status: needsApproval ? 'PENDING_APPROVAL' : 'APPROVED',
      },
    });

    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.walletAdjustmentRequested,
      entityType: 'WalletAdjustmentRequest',
      entityId: request.id,
      after: { amountMinor: dto.amountMinor, direction: dto.direction, reason: dto.reason, needsApproval },
    });

    if (!needsApproval) {
      return this.apply(request.id, actorId, wallet.type);
    }
    return this.getDtoById(request.id);
  }

  async review(actorId: string, requestId: string, decision: 'APPROVE' | 'REJECT', note?: string): Promise<WalletAdjustmentRequestDto> {
    const request = await this.prisma.walletAdjustmentRequest.findUnique({ where: { id: requestId }, include: { wallet: true } });
    if (!request) throw new ApiException('ADJUSTMENT_NOT_PENDING', 'Adjustment request not found.');
    if (request.status !== 'PENDING_APPROVAL') {
      throw new ApiException('ADJUSTMENT_NOT_PENDING', 'This request has already been reviewed.');
    }
    if (request.requestedById === actorId) {
      throw new ApiException('SELF_APPROVAL_NOT_ALLOWED', 'You cannot approve your own adjustment request.');
    }

    if (decision === 'REJECT') {
      await this.prisma.walletAdjustmentRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', reviewedById: actorId, reviewNote: note, reviewedAt: new Date() },
      });
      await this.audit.record({
        actorId,
        action: AUDIT_ACTIONS.walletAdjustmentReviewed,
        entityType: 'WalletAdjustmentRequest',
        entityId: requestId,
        after: { status: 'REJECTED', note },
      });
      return this.getDtoById(requestId);
    }

    await this.prisma.walletAdjustmentRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', reviewedById: actorId, reviewNote: note, reviewedAt: new Date() },
    });
    return this.apply(requestId, actorId, request.wallet.type);
  }

  async list(args: { skip: number; take: number; status?: string }): Promise<{ items: WalletAdjustmentRequestDto[]; total: number }> {
    const where: Prisma.WalletAdjustmentRequestWhereInput = { status: args.status as never };
    const [rows, total] = await Promise.all([
      this.prisma.walletAdjustmentRequest.findMany({
        where,
        include: { wallet: { include: { user: { select: { fullName: true } } } }, requestedBy: { select: { id: true, fullName: true } }, reviewedBy: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: args.skip,
        take: args.take,
      }),
      this.prisma.walletAdjustmentRequest.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        walletId: row.walletId,
        walletType: row.wallet.type,
        memberId: row.wallet.userId,
        memberName: row.wallet.user.fullName,
        amount: toMoney(row.amountMinor, row.currency),
        direction: row.direction,
        reason: row.reason,
        status: row.status,
        requestedBy: { id: row.requestedBy.id, name: row.requestedBy.fullName },
        reviewedBy: row.reviewedBy ? { id: row.reviewedBy.id, name: row.reviewedBy.fullName } : null,
        reviewNote: row.reviewNote,
        walletTransactionId: row.walletTransactionId,
        createdAt: row.createdAt.toISOString(),
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
      })),
      total,
    };
  }

  private async apply(requestId: string, actorId: string, walletType: PostTransactionParams['walletType']): Promise<WalletAdjustmentRequestDto> {
    const request = await this.prisma.walletAdjustmentRequest.findUniqueOrThrow({ where: { id: requestId }, include: { wallet: true } });

    const transaction = await this.ledger.postTransaction({
      userId: request.wallet.userId,
      walletType,
      currency: request.currency,
      type: 'ADJUSTMENT',
      direction: request.direction,
      amountMinor: Number(request.amountMinor),
      description: request.reason,
      descriptionCode: 'ADMIN_ADJUSTMENT',
      referenceType: 'ADJUSTMENT',
      referenceId: request.id,
      idempotencyKey: `adjustment:${request.id}`,
    });

    await this.prisma.walletAdjustmentRequest.update({
      where: { id: requestId },
      data: { status: 'APPLIED', walletTransactionId: transaction.id },
    });

    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.walletAdjustmentReviewed,
      entityType: 'WalletAdjustmentRequest',
      entityId: requestId,
      after: { status: 'APPLIED', walletTransactionId: transaction.id },
    });

    return this.getDtoById(requestId);
  }

  private async getDtoById(requestId: string): Promise<WalletAdjustmentRequestDto> {
    const request = await this.prisma.walletAdjustmentRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: {
        wallet: { include: { user: { select: { fullName: true } } } },
        requestedBy: { select: { id: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });
    return {
      id: request.id,
      walletId: request.walletId,
      walletType: request.wallet.type,
      memberId: request.wallet.userId,
      memberName: request.wallet.user.fullName,
      amount: toMoney(request.amountMinor, request.currency),
      direction: request.direction,
      reason: request.reason,
      status: request.status,
      requestedBy: { id: request.requestedBy.id, name: request.requestedBy.fullName },
      reviewedBy: request.reviewedBy ? { id: request.reviewedBy.id, name: request.reviewedBy.fullName } : null,
      reviewNote: request.reviewNote,
      walletTransactionId: request.walletTransactionId,
      createdAt: request.createdAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
    };
  }
}
