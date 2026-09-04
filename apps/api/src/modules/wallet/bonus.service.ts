import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { BonusRule, BonusRecord } from '@prisma/client';
import { canTransition, BONUS_RECORD_TRANSITIONS } from '@ptg/types';
import type { BonusRecordDto, BonusRecordStatus, BonusRuleDto, BonusRuleInput, BonusSummaryDto } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { toMoney, toMinorBigInt } from '../../common/money.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AUDIT_ACTIONS } from '@ptg/config';
import { WalletLedgerService } from './wallet-ledger.service.js';

/**
 * Bonus rules are administrator-authored configuration; this service never
 * hard-codes a payout formula. It manages the rule catalogue, the traceable
 * record lifecycle (PENDING -> APPROVED -> PAID / REJECTED), and posts the
 * BONUS_POOL ledger entry once a record is actually paid. The amount that
 * lands in `calculationBasis`/`amountMinor` always originates from an
 * explicit admin action, not an invented formula.
 */
@Injectable()
export class BonusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: WalletLedgerService,
    private readonly audit: AuditService,
  ) {}

  // --- rules (admin) -----------------------------------------------------------

  async listRules(): Promise<BonusRuleDto[]> {
    const rules = await this.prisma.bonusRule.findMany({ orderBy: { createdAt: 'desc' } });
    return rules.map(toRuleDto);
  }

  async createRule(actorId: string, input: BonusRuleInput): Promise<BonusRuleDto> {
    const existing = await this.prisma.bonusRule.findUnique({ where: { code: input.code } });
    if (existing) throw new ApiException('BONUS_RULE_CODE_TAKEN', 'A bonus rule with this code already exists.');

    const rule = await this.prisma.bonusRule.create({
      data: {
        name: input.name,
        code: input.code,
        type: input.type,
        description: input.description,
        active: input.active,
        configuration: input.configuration as Prisma.InputJsonValue,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      },
    });
    await this.audit.record({ actorId, action: AUDIT_ACTIONS.bonusRuleCreated, entityType: 'BonusRule', entityId: rule.id, after: input });
    return toRuleDto(rule);
  }

  async updateRule(actorId: string, id: string, input: Partial<BonusRuleInput>): Promise<BonusRuleDto> {
    const before = await this.prisma.bonusRule.findUnique({ where: { id } });
    if (!before) throw new ApiException('BONUS_RULE_NOT_FOUND', 'Bonus rule not found.');

    const rule = await this.prisma.bonusRule.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        active: input.active,
        configuration: input.configuration as Prisma.InputJsonValue | undefined,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : undefined,
        effectiveTo: input.effectiveTo === null ? null : input.effectiveTo ? new Date(input.effectiveTo) : undefined,
      },
    });
    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.bonusRuleUpdated,
      entityType: 'BonusRule',
      entityId: id,
      before: { active: before.active, configuration: before.configuration },
      after: { active: rule.active, configuration: rule.configuration },
    });
    return toRuleDto(rule);
  }

  // --- records -------------------------------------------------------------------

  async listRecordsForMember(
    memberId: string,
    args: { skip: number; take: number; status?: BonusRecordStatus },
  ): Promise<{ items: BonusRecordDto[]; total: number }> {
    return this.listRecords({ ...args, memberId });
  }

  async listRecords(args: {
    skip: number;
    take: number;
    status?: BonusRecordStatus;
    memberId?: string;
    ruleCode?: string;
  }): Promise<{ items: BonusRecordDto[]; total: number }> {
    const where: Prisma.BonusRecordWhereInput = {
      status: args.status,
      memberId: args.memberId,
      rule: args.ruleCode ? { code: args.ruleCode } : undefined,
    };
    const [rows, total] = await Promise.all([
      this.prisma.bonusRecord.findMany({
        where,
        include: { rule: true, member: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: args.skip,
        take: args.take,
      }),
      this.prisma.bonusRecord.count({ where }),
    ]);
    return { items: rows.map((row) => toRecordDto(row, row.rule, row.member.fullName)), total };
  }

  async getSummaryForMember(memberId: string): Promise<BonusSummaryDto> {
    const records = await this.prisma.bonusRecord.findMany({ where: { memberId }, include: { rule: true } });
    const currency = records[0]?.currency ?? 'USD';
    const sum = (statuses: string[]) =>
      records.filter((r) => statuses.includes(r.status)).reduce((acc, r) => acc + r.amountMinor, 0n);

    const byRuleMap = new Map<string, { ruleName: string; amountMinor: bigint; count: number }>();
    for (const record of records) {
      const existing = byRuleMap.get(record.rule.code) ?? { ruleName: record.rule.name, amountMinor: 0n, count: 0 };
      existing.amountMinor += record.amountMinor;
      existing.count += 1;
      byRuleMap.set(record.rule.code, existing);
    }

    return {
      totalEarned: toMoney(sum(['APPROVED', 'PAID']), currency),
      totalPending: toMoney(sum(['PENDING']), currency),
      totalPaid: toMoney(sum(['PAID']), currency),
      recordCount: records.length,
      byRule: [...byRuleMap.entries()].map(([ruleCode, v]) => ({
        ruleCode,
        ruleName: v.ruleName,
        amount: toMoney(v.amountMinor, currency),
        count: v.count,
      })),
    };
  }

  /** Admin-only: records a bonus determined outside this system (a rule run, a manual grant) so it can enter the traceable PENDING -> PAID lifecycle. */
  async createRecord(
    actorId: string,
    input: { memberId: string; ruleId: string; amountMinor: number; currency: string; sourceLabel?: string; calculationBasis?: Record<string, unknown> },
  ): Promise<BonusRecordDto> {
    const rule = await this.prisma.bonusRule.findUnique({ where: { id: input.ruleId } });
    if (!rule) throw new ApiException('BONUS_RULE_NOT_FOUND', 'Bonus rule not found.');
    if (!rule.active) throw new ApiException('BONUS_RULE_INACTIVE', 'This bonus rule is not active.');

    const record = await this.prisma.bonusRecord.create({
      data: {
        memberId: input.memberId,
        ruleId: input.ruleId,
        amountMinor: toMinorBigInt(input.amountMinor),
        currency: input.currency,
        status: 'PENDING',
        sourceType: 'MANUAL',
        sourceLabel: input.sourceLabel,
        calculationBasis: (input.calculationBasis ?? undefined) as Prisma.InputJsonValue,
      },
      include: { rule: true, member: { select: { fullName: true } } },
    });

    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.bonusRecordStatusChanged,
      entityType: 'BonusRecord',
      entityId: record.id,
      after: { status: 'PENDING', amountMinor: input.amountMinor },
    });

    return toRecordDto(record, record.rule, record.member.fullName);
  }

  async transitionRecord(actorId: string, recordId: string, nextStatus: BonusRecordStatus): Promise<BonusRecordDto> {
    const record = await this.prisma.bonusRecord.findUnique({ where: { id: recordId }, include: { rule: true, member: { select: { fullName: true } } } });
    if (!record) throw new ApiException('BONUS_RECORD_NOT_FOUND', 'Bonus record not found.');
    if (!canTransition(BONUS_RECORD_TRANSITIONS, record.status, nextStatus)) {
      throw new ApiException('CONFLICT', `Cannot move a bonus record from ${record.status} to ${nextStatus}.`);
    }

    let walletTransactionId: string | null = record.walletTransactionId;
    if (nextStatus === 'PAID') {
      if (record.walletTransactionId) throw new ApiException('BONUS_ALREADY_PAID', 'This bonus has already been paid.');
      const transaction = await this.ledger.postTransaction({
        userId: record.memberId,
        walletType: 'BONUS_POOL',
        currency: record.currency,
        type: 'BONUS',
        direction: 'IN',
        amountMinor: Number(record.amountMinor),
        description: `Bonus payout: ${record.rule.name}`,
        descriptionCode: 'BONUS_PAYOUT',
        referenceType: 'BONUS_RECORD',
        referenceId: record.id,
        referenceLabel: record.rule.name,
        idempotencyKey: `bonus-payout:${record.id}`,
      });
      walletTransactionId = transaction.id;
    }

    const updated = await this.prisma.bonusRecord.update({
      where: { id: recordId },
      data: {
        status: nextStatus,
        walletTransactionId,
        paidAt: nextStatus === 'PAID' ? new Date() : undefined,
      },
      include: { rule: true, member: { select: { fullName: true } } },
    });

    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.bonusRecordStatusChanged,
      entityType: 'BonusRecord',
      entityId: recordId,
      before: { status: record.status },
      after: { status: nextStatus },
    });

    return toRecordDto(updated, updated.rule, updated.member.fullName);
  }
}

function toRuleDto(rule: BonusRule): BonusRuleDto {
  return {
    id: rule.id,
    name: rule.name,
    code: rule.code,
    type: rule.type,
    description: rule.description,
    active: rule.active,
    configuration: rule.configuration as Record<string, unknown>,
    effectiveFrom: rule.effectiveFrom.toISOString(),
    effectiveTo: rule.effectiveTo?.toISOString() ?? null,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function toRecordDto(record: BonusRecord, rule: BonusRule, memberName: string): BonusRecordDto {
  return {
    id: record.id,
    memberId: record.memberId,
    memberName,
    rule: { id: rule.id, name: rule.name, code: rule.code, type: rule.type },
    amount: toMoney(record.amountMinor, record.currency),
    status: record.status,
    source: record.sourceType ? { type: record.sourceType, id: record.sourceId, label: record.sourceLabel } : null,
    calculationBasis: record.calculationBasis as Record<string, unknown> | null,
    walletTransactionId: record.walletTransactionId,
    periodStart: record.periodStart?.toISOString() ?? null,
    periodEnd: record.periodEnd?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    paidAt: record.paidAt?.toISOString() ?? null,
  };
}
