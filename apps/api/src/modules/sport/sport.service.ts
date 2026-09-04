import { Injectable } from '@nestjs/common';
import type { RankingEntryDto, RankingPeriod, RankingResponse, SportMetricDto, SportScoreDto } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';

function periodRange(period: RankingPeriod, reference = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const end = new Date(start);

  if (period === 'DAILY') {
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (period === 'WEEKLY') {
    const day = start.getUTCDay();
    start.setUTCDate(start.getUTCDate() - day);
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 7);
  } else if (period === 'MONTHLY') {
    start.setUTCDate(1);
    end.setTime(start.getTime());
    end.setUTCMonth(end.getUTCMonth() + 1);
  } else {
    start.setUTCFullYear(2000, 0, 1);
    end.setUTCFullYear(2100, 0, 1);
  }
  return { start, end };
}

/**
 * Ranking is computed live from raw scores (bounded, indexed query) rather
 * than an invented physiological formula - each SportMetric's
 * `scoreWeightMilli` is entirely admin-configured. A pre-aggregated
 * SportRanking table exists in the schema for a future BullMQ aggregation
 * worker to cache this at higher volume (see docs/ARCHITECTURE.md).
 */
@Injectable()
export class SportService {
  constructor(private readonly prisma: PrismaService) {}

  async listMetrics(activeOnly = true): Promise<SportMetricDto[]> {
    const metrics = await this.prisma.sportMetric.findMany({ where: activeOnly ? { active: true } : undefined, orderBy: { name: 'asc' } });
    return metrics.map((m) => ({ id: m.id, code: m.code, name: m.name, unit: m.unit, scoreWeightMilli: m.scoreWeightMilli, active: m.active }));
  }

  async upsertMetric(input: { code: string; name: string; unit: string; scoreWeightMilli: number; active: boolean }): Promise<SportMetricDto> {
    const metric = await this.prisma.sportMetric.upsert({
      where: { code: input.code },
      create: { code: input.code, name: input.name, unit: input.unit as never, scoreWeightMilli: input.scoreWeightMilli, active: input.active },
      update: { name: input.name, unit: input.unit as never, scoreWeightMilli: input.scoreWeightMilli, active: input.active },
    });
    return { id: metric.id, code: metric.code, name: metric.name, unit: metric.unit, scoreWeightMilli: metric.scoreWeightMilli, active: metric.active };
  }

  async submitScore(userId: string, metricCode: string, value: number, recordedFor: string): Promise<SportScoreDto> {
    const metric = await this.prisma.sportMetric.findUnique({ where: { code: metricCode } });
    if (!metric || !metric.active) throw new ApiException('SPORT_METRIC_NOT_FOUND', 'This sport metric is not available.');

    const score = Math.round((value * metric.scoreWeightMilli) / 1000);
    const row = await this.prisma.sportScore.upsert({
      where: { userId_metricId_recordedFor: { userId, metricId: metric.id, recordedFor: new Date(recordedFor) } },
      create: { userId, metricId: metric.id, value, score, recordedFor: new Date(recordedFor) },
      update: { value, score },
    });
    return { id: row.id, metricCode: metric.code, metricName: metric.name, value: row.value, score: row.score, recordedFor: row.recordedFor.toISOString().slice(0, 10), createdAt: row.createdAt.toISOString() };
  }

  async listMyScores(userId: string, args: { skip: number; take: number }): Promise<{ items: SportScoreDto[]; total: number }> {
    const where = { userId };
    const [rows, total] = await Promise.all([
      this.prisma.sportScore.findMany({ where, include: { metric: true }, orderBy: { recordedFor: 'desc' }, skip: args.skip, take: args.take }),
      this.prisma.sportScore.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({ id: r.id, metricCode: r.metric.code, metricName: r.metric.name, value: r.value, score: r.score, recordedFor: r.recordedFor.toISOString().slice(0, 10), createdAt: r.createdAt.toISOString() })),
      total,
    };
  }

  async getRanking(userId: string, period: RankingPeriod, metricCode: string | undefined, take: number): Promise<RankingResponse> {
    const { start, end } = periodRange(period);
    const scoreWhere = {
      recordedFor: { gte: start, lt: end },
      metric: metricCode ? { code: metricCode } : undefined,
    };

    const grouped = await this.prisma.sportScore.groupBy({
      by: ['userId'],
      where: scoreWhere,
      _sum: { score: true },
      orderBy: { _sum: { score: 'desc' } },
      take,
    });

    const userIds = grouped.map((g) => g.userId);
    const [users, breakdownRows, totalParticipants] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, memberId: true, displayName: true, avatarUrl: true } }),
      this.prisma.sportScore.findMany({ where: { ...scoreWhere, userId: { in: userIds } }, include: { metric: true } }),
      this.prisma.sportScore.groupBy({ by: ['userId'], where: scoreWhere }).then((rows) => rows.length),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));

    const entries: RankingEntryDto[] = grouped.map((g, index) => {
      const user = userMap.get(g.userId);
      const breakdownForUser = breakdownRows.filter((b) => b.userId === g.userId);
      const byMetric = new Map<string, { metricName: string; value: number; score: number }>();
      for (const b of breakdownForUser) {
        const existing = byMetric.get(b.metric.code) ?? { metricName: b.metric.name, value: 0, score: 0 };
        existing.value += b.value;
        existing.score += b.score;
        byMetric.set(b.metric.code, existing);
      }
      return {
        rank: index + 1,
        member: user ? { id: user.id, memberId: user.memberId, displayName: user.displayName, avatarUrl: user.avatarUrl } : { id: g.userId, memberId: '', displayName: 'Member', avatarUrl: null },
        score: g._sum.score ?? 0,
        breakdown: [...byMetric.entries()].map(([metricCode_, v]) => ({ metricCode: metricCode_, metricName: v.metricName, value: v.value, score: v.score })),
        isCurrentUser: g.userId === userId,
      };
    });

    return {
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      entries,
      currentUserEntry: entries.find((e) => e.isCurrentUser) ?? null,
      totalParticipants,
    };
  }
}
