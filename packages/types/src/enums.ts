// ---------------------------------------------------------------------------
// Domain enumerations shared by the API, the web app and the admin app.
// These mirror the Prisma enums one-for-one.
// ---------------------------------------------------------------------------

export const USER_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const MEMBERSHIP_STATUSES = ['PENDING', 'ACTIVE', 'INACTIVE', 'TERMINATED'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const WALLET_TYPES = ['E_ACCOUNT', 'BONUS_POOL', 'PERSONAL_POINTS'] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

export const WALLET_STATUSES = ['ACTIVE', 'FROZEN', 'CLOSED'] as const;
export type WalletStatus = (typeof WALLET_STATUSES)[number];

export const TRANSACTION_TYPES = [
  'CREDIT',
  'DEBIT',
  'REVERSAL',
  'BONUS',
  'REFUND',
  'ADJUSTMENT',
  'ORDER_PAYMENT',
  'ORDER_REFUND',
  'TRANSFER',
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Which way a transaction moves the balance. Derived from type by the ledger service. */
export const TRANSACTION_DIRECTIONS = ['IN', 'OUT'] as const;
export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];

export const TRANSACTION_STATUSES = ['PENDING', 'POSTED', 'REVERSED', 'FAILED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const REFERENCE_TYPES = [
  'ORDER',
  'PAYMENT',
  'REFUND',
  'BONUS_RECORD',
  'ADJUSTMENT',
  'TRANSFER',
  'INVESTMENT',
  'MANUAL',
  'SYSTEM',
] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export const POINT_TRANSACTION_TYPES = [
  'EARNED',
  'SPENT',
  'ADJUSTED',
  'EXPIRED',
  'REVERSED',
] as const;
export type PointTransactionType = (typeof POINT_TRANSACTION_TYPES)[number];

export const BONUS_RULE_TYPES = [
  'DIRECT_REFERRAL',
  'TEAM_VOLUME',
  'RANK_ACHIEVEMENT',
  'ORDER_PERCENTAGE',
  'FIXED_GRANT',
  'CUSTOM',
] as const;
export type BonusRuleType = (typeof BONUS_RULE_TYPES)[number];

export const BONUS_RECORD_STATUSES = [
  'PENDING',
  'APPROVED',
  'PAID',
  'REJECTED',
  'REVERSED',
] as const;
export type BonusRecordStatus = (typeof BONUS_RECORD_STATUSES)[number];

export const PRODUCT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const STOCK_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'BACKORDER'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const INVENTORY_TRANSACTION_TYPES = [
  'RESTOCK',
  'RESERVE',
  'RELEASE',
  'FULFILL',
  'ADJUSTMENT',
  'RETURN',
] as const;
export type InventoryTransactionType = (typeof INVENTORY_TRANSACTION_TYPES)[number];

export const ORDER_STATUSES = [
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['E_ACCOUNT', 'BONUS_POOL', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SHIPMENT_STATUSES = [
  'PENDING',
  'PACKED',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const DELIVERY_METHODS = ['STANDARD', 'EXPRESS', 'PICKUP'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const HEALTH_GOALS = ['WEIGHT_LOSS', 'MAINTENANCE', 'WEIGHT_GAIN', 'FITNESS'] as const;
export type HealthGoal = (typeof HEALTH_GOALS)[number];

export const ACTIVITY_LEVELS = [
  'SEDENTARY',
  'LIGHT',
  'MODERATE',
  'ACTIVE',
  'VERY_ACTIVE',
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'] as const;
export type Gender = (typeof GENDERS)[number];

export const CONTENT_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const MODERATION_STATUSES = ['VISIBLE', 'FLAGGED', 'HIDDEN', 'REMOVED'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const REPORT_STATUSES = ['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REACTION_TYPES = ['LIKE', 'CELEBRATE', 'SUPPORT', 'INSIGHTFUL'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const SPORT_METRIC_UNITS = ['STEPS', 'METERS', 'MINUTES', 'COUNT', 'POINTS'] as const;
export type SportMetricUnit = (typeof SPORT_METRIC_UNITS)[number];

export const RANKING_PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'] as const;
export type RankingPeriod = (typeof RANKING_PERIODS)[number];

export const PROMOTION_STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'ARCHIVED'] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export const INVESTMENT_PLAN_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'] as const;
export type InvestmentPlanStatus = (typeof INVESTMENT_PLAN_STATUSES)[number];

export const INVESTMENT_ENROLLMENT_STATUSES = [
  'PENDING',
  'ACTIVE',
  'MATURED',
  'CANCELLED',
] as const;
export type InvestmentEnrollmentStatus = (typeof INVESTMENT_ENROLLMENT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'ORDER',
  'PAYMENT',
  'FULFILLMENT',
  'BONUS',
  'SYSTEM',
  'PROMOTION',
  'COMMUNITY',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ADJUSTMENT_REQUEST_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'APPLIED',
] as const;
export type AdjustmentRequestStatus = (typeof ADJUSTMENT_REQUEST_STATUSES)[number];

export const TREE_KINDS = ['SPONSOR', 'PLACEMENT'] as const;
export type TreeKind = (typeof TREE_KINDS)[number];
