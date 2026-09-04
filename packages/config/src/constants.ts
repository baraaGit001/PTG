/** Values shared by the API and both frontends so limits never disagree. */

export const API_PREFIX = '/api/v1';

export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

export const TREE = {
  /** Generations returned in a single tree request. */
  defaultDepth: 3,
  maxDepth: 8,
  /** Hard stop for downline aggregation queries. */
  maxTraversalNodes: 5000,
} as const;

export const CART = {
  maxDistinctItems: 50,
  maxQuantityPerItem: 999,
} as const;

export const ADDRESS = {
  maxPerUser: 20,
} as const;

export const UPLOAD = {
  maxFileSizeBytes: 5 * 1024 * 1024,
  allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const,
} as const;

export const PASSWORD_POLICY = {
  minLength: 10,
  maxLength: 128,
  requireLowercase: true,
  requireUppercase: true,
  requireDigit: true,
} as const;

export const MEMBER_ID = {
  minLength: 4,
  maxLength: 32,
  /** Uppercase alphanumeric with optional dashes, e.g. PTG-100234. */
  pattern: /^[A-Z0-9][A-Z0-9-]{2,30}[A-Z0-9]$/,
} as const;

export const COMMUNITY = {
  maxPostLength: 5000,
  maxCommentLength: 2000,
  maxImagesPerPost: 6,
  maxTagsPerPost: 5,
} as const;

/** Settings keys that live in `SystemSetting` and are admin-editable. */
export const SETTING_KEYS = {
  brandName: 'brand.name',
  brandLogoUrl: 'brand.logoUrl',
  defaultCurrency: 'platform.defaultCurrency',
  defaultLocale: 'platform.defaultLocale',
  supportedLocales: 'platform.supportedLocales',
  demoMode: 'platform.demoMode',
  guestBrowsingEnabled: 'platform.guestBrowsingEnabled',
  registrationEnabled: 'platform.registrationEnabled',
  dashboardKpis: 'dashboard.kpis',
  walletAllowNegative: 'wallet.allowNegativeBalance',
  walletTransferEnabled: 'wallet.transferEnabled',
  walletAdjustmentApprovalRequired: 'wallet.adjustmentApprovalRequired',
  walletAdjustmentApprovalThresholdMinor: 'wallet.adjustmentApprovalThresholdMinor',
  pointsExpiryDays: 'points.expiryDays',
  orderNumberPrefix: 'orders.numberPrefix',
  lowStockThreshold: 'inventory.lowStockThreshold',
  shippingMethods: 'shipping.methods',
  communityModerationRequired: 'community.moderationRequired',
  sportRankingWeights: 'sport.rankingWeights',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** Audit action names. Kept centrally so log queries stay reliable. */
export const AUDIT_ACTIONS = {
  loginSucceeded: 'auth.login.succeeded',
  loginFailed: 'auth.login.failed',
  logout: 'auth.logout',
  tokenRefreshed: 'auth.token.refreshed',
  refreshTokenReuse: 'auth.token.reuse_detected',
  passwordChanged: 'auth.password.changed',
  passwordReset: 'auth.password.reset',
  userCreated: 'user.created',
  userUpdated: 'user.updated',
  userRolesChanged: 'user.roles.changed',
  userStatusChanged: 'user.status.changed',
  walletAdjustmentRequested: 'wallet.adjustment.requested',
  walletAdjustmentReviewed: 'wallet.adjustment.reviewed',
  walletTransactionPosted: 'wallet.transaction.posted',
  walletTransactionReversed: 'wallet.transaction.reversed',
  pointsAdjusted: 'points.adjusted',
  bonusRuleCreated: 'bonus.rule.created',
  bonusRuleUpdated: 'bonus.rule.updated',
  bonusRecordStatusChanged: 'bonus.record.status_changed',
  productCreated: 'product.created',
  productUpdated: 'product.updated',
  productPriceChanged: 'product.price.changed',
  productDeleted: 'product.deleted',
  inventoryAdjusted: 'inventory.adjusted',
  orderCreated: 'order.created',
  orderStatusChanged: 'order.status.changed',
  orderRefunded: 'order.refunded',
  shipmentUpdated: 'shipment.updated',
  contentPublished: 'content.published',
  contentModerated: 'content.moderated',
  promotionUpdated: 'promotion.updated',
  settingUpdated: 'setting.updated',
  translationUpdated: 'translation.updated',
  investmentPlanUpdated: 'investment.plan.updated',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/** Queue names used by BullMQ workers. */
export const QUEUES = {
  bonusCalculation: 'bonus-calculation',
  notifications: 'notifications',
  rankingAggregation: 'ranking-aggregation',
  pointsExpiry: 'points-expiry',
  orderTimeout: 'order-timeout',
} as const;

/** Redis cache key builders. Financial ledger reads are never cached. */
export const CACHE_KEYS = {
  publicSettings: 'settings:public',
  categoryTree: 'catalog:categories:tree',
  productDetail: (slug: string) => `catalog:product:${slug}`,
  ranking: (period: string, metric: string) => `sport:ranking:${period}:${metric}`,
  translations: (locale: string) => `i18n:${locale}`,
} as const;

export const CACHE_TTL_SECONDS = {
  publicSettings: 300,
  categoryTree: 300,
  productDetail: 120,
  ranking: 60,
  translations: 600,
} as const;
