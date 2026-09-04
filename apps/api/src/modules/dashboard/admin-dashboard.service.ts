import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AdminDashboardDto } from '@ptg/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AppConfig } from '../../config/configuration.js';
import { toMoney } from '../../common/money.util.js';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async getDashboard(): Promise<AdminDashboardDto> {
    const currency = this.config.get('platform', { infer: true }).defaultCurrency;
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      userCount,
      partnerCount,
      activeMemberCount,
      orders30d,
      revenueAgg,
      pendingFulfillment,
      pendingBonusRecords,
      pendingWalletAdjustments,
      openCommunityReports,
      lowStockVariants,
      recentAudit,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.partnerProfile.count(),
      this.prisma.partnerProfile.count({ where: { membershipStatus: 'ACTIVE' } }),
      this.prisma.order.count({ where: { placedAt: { gte: since30d } } }),
      this.prisma.order.aggregate({ where: { placedAt: { gte: since30d }, paymentStatus: 'PAID' }, _sum: { totalMinor: true } }),
      this.prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
      this.prisma.bonusRecord.count({ where: { status: 'PENDING' } }),
      this.prisma.walletAdjustmentRequest.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.communityReport.count({ where: { status: 'OPEN' } }),
      this.prisma.inventory.count({ where: { onHand: { lte: 5 } } }),
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { actor: { select: { fullName: true } } } }),
    ]);

    const salesRows = await this.prisma.order.findMany({
      where: { placedAt: { gte: since30d }, paymentStatus: 'PAID' },
      select: { placedAt: true, totalMinor: true },
    });
    const salesByDate = new Map<string, { revenueMinor: number; orderCount: number }>();
    for (const row of salesRows) {
      const key = row.placedAt.toISOString().slice(0, 10);
      const entry = salesByDate.get(key) ?? { revenueMinor: 0, orderCount: 0 };
      entry.revenueMinor += Number(row.totalMinor);
      entry.orderCount += 1;
      salesByDate.set(key, entry);
    }

    const topProductsRaw = await this.prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: { placedAt: { gte: since30d }, paymentStatus: 'PAID' } },
      _sum: { quantity: true, lineTotalMinor: true },
      orderBy: { _sum: { lineTotalMinor: 'desc' } },
      take: 5,
    });

    return {
      totals: {
        users: userCount,
        partners: partnerCount,
        activeMembers: activeMemberCount,
        orders30d,
        revenue30d: toMoney(revenueAgg._sum.totalMinor ?? 0n, currency),
        pendingFulfillment,
        pendingBonusRecords,
        pendingWalletAdjustments,
        openCommunityReports,
        lowStockVariants,
      },
      salesSeries: [...salesByDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })),
      walletActivitySeries: [],
      topProducts: topProductsRaw.map((row) => ({
        productId: row.productId,
        name: row.productName,
        unitsSold: row._sum.quantity ?? 0,
        revenue: toMoney(BigInt(row._sum.lineTotalMinor ?? 0), currency),
      })),
      recentAuditActions: recentAudit.map((a) => ({ id: a.id, action: a.action, actorName: a.actor?.fullName ?? null, entityType: a.entityType, createdAt: a.createdAt.toISOString() })),
      currency,
      generatedAt: new Date().toISOString(),
    };
  }
}
