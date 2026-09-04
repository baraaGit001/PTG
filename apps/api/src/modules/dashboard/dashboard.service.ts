import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SETTING_KEYS } from '@ptg/config';
import type { DashboardDto, DashboardKpiDto } from '@ptg/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AppConfig } from '../../config/configuration.js';
import { SettingsService } from '../settings/settings.service.js';
import { WalletLedgerService } from '../wallet/wallet-ledger.service.js';
import { PointsService } from '../wallet/points.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PromotionsService } from '../promotions/promotions.service.js';

function greetingCode(hour: number): 'MORNING' | 'AFTERNOON' | 'EVENING' {
  if (hour < 12) return 'MORNING';
  if (hour < 18) return 'AFTERNOON';
  return 'EVENING';
}

/**
 * Reads through the same domain services as their dedicated pages (wallet,
 * orders, notifications, promotions) - there is no second calculation of a
 * balance or order total here, satisfying the single-source-of-truth rule.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly settings: SettingsService,
    private readonly ledger: WalletLedgerService,
    private readonly points: PointsService,
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
    private readonly promotions: PromotionsService,
  ) {}

  async getDashboard(userId: string): Promise<DashboardDto> {
    const platform = this.config.get('platform', { infer: true });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { partnerProfile: true } });

    const [wallets, pointsSummary, recentOrdersPage, notificationsPage, notificationCounts, activePromotions, kpiConfig] = await Promise.all([
      this.ledger.getWalletSummary(userId, platform.defaultCurrency),
      this.points.getSummary(userId),
      this.orders.listOrders(userId, { page: 1, pageSize: 5 }),
      this.notifications.list(userId, { page: 1, pageSize: 5 }),
      this.notifications.counts(userId),
      this.promotions.listActive(),
      this.settings.get<DashboardDto['kpis']>(SETTING_KEYS.dashboardKpis, []),
    ]);

    const eAccount = wallets.find((w) => w.type === 'E_ACCOUNT')!;
    const bonusPool = wallets.find((w) => w.type === 'BONUS_POOL')!;

    const defaultKpis: DashboardKpiDto[] = [
      { key: 'e_account', labelCode: 'dashboard.kpi.eAccount', accent: 'green', money: eAccount.balance, count: null, deltaMinor: null, walletType: 'E_ACCOUNT' },
      { key: 'bonus_pool', labelCode: 'dashboard.kpi.bonusPool', accent: 'blue', money: bonusPool.balance, count: null, deltaMinor: null, walletType: 'BONUS_POOL' },
      { key: 'personal_points', labelCode: 'dashboard.kpi.personalPoints', accent: 'orange', money: null, count: pointsSummary.balance, deltaMinor: null, walletType: 'PERSONAL_POINTS' },
    ];

    const recentTransactions = await this.ledger.listTransactions(userId, 'E_ACCOUNT', { skip: 0, take: 5, filters: {} });

    return {
      greetingCode: greetingCode(new Date().getHours()),
      member: {
        id: user.id,
        memberId: user.memberId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        rank: user.partnerProfile?.rank ?? null,
      },
      kpis: kpiConfig.length ? kpiConfig : defaultKpis,
      recentOrders: recentOrdersPage.items,
      recentTransactions: recentTransactions.items,
      notifications: notificationsPage.items,
      promotions: activePromotions,
      unreadNotificationCount: notificationCounts.unread,
      demoMode: platform.demoMode,
      generatedAt: new Date().toISOString(),
    };
  }
}
