import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AUDIT_ACTIONS } from '@ptg/config';
import type { InvestmentEnrollmentDto, InvestmentPlanDto, InvestmentPlanInput } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { toMoney, toMinorBigInt } from '../../common/money.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { WalletLedgerService } from '../wallet/wallet-ledger.service.js';

/**
 * Investment plans are descriptive configuration only. This service never
 * computes a return, yield, or performance figure - `InvestmentPerformanceSnapshot`
 * rows are pure admin-entered data points. If real performance calculations
 * are supplied later, they belong in a new, separately-reviewed service -
 * never bolted onto this one.
 */
@Injectable()
export class InvestmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: WalletLedgerService,
    private readonly audit: AuditService,
  ) {}

  async listOpenPlans(): Promise<InvestmentPlanDto[]> {
    const plans = await this.prisma.investmentPlan.findMany({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' } });
    return plans.map(toPlanDto);
  }

  async adminListPlans(): Promise<InvestmentPlanDto[]> {
    const plans = await this.prisma.investmentPlan.findMany({ orderBy: { createdAt: 'desc' } });
    return plans.map(toPlanDto);
  }

  async createPlan(actorId: string, input: InvestmentPlanInput): Promise<InvestmentPlanDto> {
    const existing = await this.prisma.investmentPlan.findUnique({ where: { slug: input.slug } });
    if (existing) throw new ApiException('SLUG_TAKEN', 'A plan with this slug already exists.');
    const plan = await this.prisma.investmentPlan.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        minimumAmountMinor: toMinorBigInt(input.minimumAmountMinor),
        maximumAmountMinor: input.maximumAmountMinor != null ? toMinorBigInt(input.maximumAmountMinor) : null,
        currency: input.currency,
        termDays: input.termDays,
        riskLabel: input.riskLabel,
        status: input.status,
        configuration: (input.configuration ?? {}) as Prisma.InputJsonValue,
      },
    });
    await this.audit.record({ actorId, action: AUDIT_ACTIONS.investmentPlanUpdated, entityType: 'InvestmentPlan', entityId: plan.id, after: { slug: input.slug } });
    return toPlanDto(plan);
  }

  async updatePlan(actorId: string, id: string, input: Partial<InvestmentPlanInput>): Promise<InvestmentPlanDto> {
    const before = await this.prisma.investmentPlan.findUnique({ where: { id } });
    if (!before) throw new ApiException('INVESTMENT_PLAN_NOT_FOUND', 'Plan not found.');
    const plan = await this.prisma.investmentPlan.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        minimumAmountMinor: input.minimumAmountMinor != null ? toMinorBigInt(input.minimumAmountMinor) : undefined,
        maximumAmountMinor: input.maximumAmountMinor != null ? toMinorBigInt(input.maximumAmountMinor) : undefined,
        termDays: input.termDays,
        riskLabel: input.riskLabel,
        status: input.status,
        configuration: input.configuration as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.record({ actorId, action: AUDIT_ACTIONS.investmentPlanUpdated, entityType: 'InvestmentPlan', entityId: id, before: { status: before.status }, after: { status: plan.status } });
    return toPlanDto(plan);
  }

  async enroll(userId: string, planId: string, amountMinor: number, idempotencyKey: string): Promise<InvestmentEnrollmentDto> {
    const plan = await this.prisma.investmentPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new ApiException('INVESTMENT_PLAN_NOT_FOUND', 'Plan not found.');
    if (plan.status !== 'OPEN') throw new ApiException('INVESTMENT_PLAN_CLOSED', 'This plan is not currently open for enrollment.');
    if (amountMinor < Number(plan.minimumAmountMinor) || (plan.maximumAmountMinor != null && amountMinor > Number(plan.maximumAmountMinor))) {
      throw new ApiException('INVESTMENT_AMOUNT_OUT_OF_RANGE', 'The contribution amount is outside the allowed range for this plan.');
    }

    const existingTx = await this.prisma.investmentTransaction.findUnique({ where: { idempotencyKey } });
    if (existingTx) {
      const enrollment = await this.prisma.investmentEnrollment.findUniqueOrThrow({ where: { id: existingTx.enrollmentId }, include: { plan: true } });
      return toEnrollmentDto(enrollment);
    }

    await this.ledger.postTransaction({
      userId,
      walletType: 'E_ACCOUNT',
      currency: plan.currency,
      type: 'DEBIT',
      direction: 'OUT',
      amountMinor,
      description: `Contribution to ${plan.name}`,
      descriptionCode: 'INVESTMENT_CONTRIBUTION',
      referenceType: 'INVESTMENT',
      referenceLabel: plan.name,
      idempotencyKey: `investment-debit:${idempotencyKey}`,
    });

    const maturesAt = plan.termDays ? new Date(Date.now() + plan.termDays * 24 * 60 * 60 * 1000) : null;
    const enrollment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.investmentEnrollment.create({
        data: { planId, userId, principalMinor: toMinorBigInt(amountMinor), currency: plan.currency, status: 'ACTIVE', startedAt: new Date(), maturesAt },
        include: { plan: true },
      });
      await tx.investmentTransaction.create({
        data: { enrollmentId: created.id, type: 'CONTRIBUTION', amountMinor: toMinorBigInt(amountMinor), currency: plan.currency, idempotencyKey },
      });
      return created;
    });

    return toEnrollmentDto(enrollment);
  }

  async listMyEnrollments(userId: string): Promise<InvestmentEnrollmentDto[]> {
    const rows = await this.prisma.investmentEnrollment.findMany({ where: { userId }, include: { plan: true }, orderBy: { createdAt: 'desc' } });
    return rows.map(toEnrollmentDto);
  }
}

function toPlanDto(plan: {
  id: string; name: string; slug: string; description: string | null; minimumAmountMinor: bigint; maximumAmountMinor: bigint | null; currency: string; termDays: number | null; riskLabel: string | null; status: string; configuration: Prisma.JsonValue; createdAt: Date; updatedAt: Date;
}): InvestmentPlanDto {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    minimumAmount: toMoney(plan.minimumAmountMinor, plan.currency),
    maximumAmount: plan.maximumAmountMinor != null ? toMoney(plan.maximumAmountMinor, plan.currency) : null,
    termDays: plan.termDays,
    riskLabel: plan.riskLabel,
    status: plan.status as InvestmentPlanDto['status'],
    configuration: (plan.configuration as Record<string, unknown>) ?? {},
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

function toEnrollmentDto(enrollment: {
  id: string; plan: { id: string; name: string; slug: string }; userId: string; principalMinor: bigint; currency: string; status: string; startedAt: Date | null; maturesAt: Date | null; createdAt: Date;
}): InvestmentEnrollmentDto {
  return {
    id: enrollment.id,
    plan: enrollment.plan,
    memberId: enrollment.userId,
    memberName: '',
    principal: toMoney(enrollment.principalMinor, enrollment.currency),
    status: enrollment.status as InvestmentEnrollmentDto['status'],
    startedAt: enrollment.startedAt?.toISOString() ?? null,
    maturesAt: enrollment.maturesAt?.toISOString() ?? null,
    createdAt: enrollment.createdAt.toISOString(),
  };
}
