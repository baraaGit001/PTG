import type { Money } from '../money.js';
import type { WalletType } from '../enums.js';
import type { OrderSummaryDto } from './order.js';
import type { WalletTransactionDto } from './wallet.js';
import type { NotificationDto, PromotionDto } from './platform.js';

/**
 * The dashboard is a read model assembled from the same domain services that
 * back the dedicated pages - there is no second source of truth for a balance.
 */
export interface DashboardKpiDto {
  key: string;
  labelCode: string;
  accent: 'green' | 'blue' | 'orange' | 'neutral';
  /** Exactly one of `money` / `count` is populated, per the KPI's source. */
  money: Money | null;
  count: number | null;
  /** Change over the comparison window, in the same unit as the value. */
  deltaMinor: number | null;
  walletType: WalletType | null;
}

export interface DashboardDto {
  greetingCode: 'MORNING' | 'AFTERNOON' | 'EVENING';
  member: {
    id: string;
    memberId: string;
    displayName: string;
    avatarUrl: string | null;
    rank: string | null;
  };
  kpis: DashboardKpiDto[];
  recentOrders: OrderSummaryDto[];
  recentTransactions: WalletTransactionDto[];
  notifications: NotificationDto[];
  promotions: PromotionDto[];
  unreadNotificationCount: number;
  /** True when the data shown originates from development seed data. */
  demoMode: boolean;
  generatedAt: string;
}

export interface AdminDashboardDto {
  totals: {
    users: number;
    partners: number;
    activeMembers: number;
    orders30d: number;
    revenue30d: Money;
    pendingFulfillment: number;
    pendingBonusRecords: number;
    pendingWalletAdjustments: number;
    openCommunityReports: number;
    lowStockVariants: number;
  };
  salesSeries: Array<{ date: string; revenueMinor: number; orderCount: number }>;
  walletActivitySeries: Array<{ date: string; inMinor: number; outMinor: number }>;
  topProducts: Array<{ productId: string; name: string; unitsSold: number; revenue: Money }>;
  recentAuditActions: Array<{
    id: string;
    action: string;
    actorName: string | null;
    entityType: string;
    createdAt: string;
  }>;
  currency: string;
  generatedAt: string;
}
