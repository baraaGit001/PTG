import type { Money } from '../money.js';
import type { ListQuery } from '../envelope.js';
import type { Locale } from '../locales.js';
import type { RoleName } from '../rbac.js';
import type {
  InvestmentEnrollmentStatus,
  InvestmentPlanStatus,
  NotificationType,
  PromotionStatus,
  UserStatus,
  WalletType,
} from '../enums.js';

// --- notifications ----------------------------------------------------------

export interface NotificationDto {
  id: string;
  type: NotificationType;
  /** Stable code translated on the client; title/body are fallbacks. */
  code: string;
  title: string;
  body: string;
  /** Interpolation values for the translated message. */
  params: Record<string, string | number> | null;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationQuery extends ListQuery {
  type?: NotificationType;
  unreadOnly?: boolean;
}

export interface NotificationCountsDto {
  total: number;
  unread: number;
}

// --- promotions -------------------------------------------------------------

export interface PromotionDto {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  /** ISO-3166-1 alpha-2 codes; empty means globally visible. */
  regions: string[];
  status: PromotionStatus;
  startAt: string;
  endAt: string | null;
  linkPath: string | null;
  /** Free-form, admin-authored rules. No behaviour is inferred client-side. */
  rules: Record<string, unknown>;
  position: number;
}

export interface PromotionInput {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  regions?: string[];
  status: PromotionStatus;
  startAt: string;
  endAt?: string | null;
  linkPath?: string | null;
  rules?: Record<string, unknown>;
  position?: number;
}

export interface PromotionQuery extends ListQuery {
  status?: PromotionStatus;
  region?: string;
}

// --- investment -------------------------------------------------------------

/**
 * Investment plans are descriptive only. No return, yield or performance value
 * is computed by this system; every figure shown originates from data the
 * client supplies through the admin panel.
 */
export interface InvestmentPlanDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  minimumAmount: Money;
  maximumAmount: Money | null;
  /** Term length in days, as configured by the administrator. */
  termDays: number | null;
  /** Free-text label such as "Conservative" - not a computed risk score. */
  riskLabel: string | null;
  status: InvestmentPlanStatus;
  configuration: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentPlanInput {
  name: string;
  slug: string;
  description?: string | null;
  minimumAmountMinor: number;
  maximumAmountMinor?: number | null;
  currency: string;
  termDays?: number | null;
  riskLabel?: string | null;
  status: InvestmentPlanStatus;
  configuration?: Record<string, unknown>;
}

export interface InvestmentEnrollmentDto {
  id: string;
  plan: { id: string; name: string; slug: string };
  memberId: string;
  memberName: string;
  principal: Money;
  status: InvestmentEnrollmentStatus;
  startedAt: string | null;
  maturesAt: string | null;
  createdAt: string;
}

export interface InvestmentPerformanceSnapshotDto {
  id: string;
  enrollmentId: string;
  /** Value supplied by the administrator; never derived by this platform. */
  value: Money;
  recordedFor: string;
  note: string | null;
  createdAt: string;
}

// --- settings & localization ------------------------------------------------

export interface SystemSettingDto {
  key: string;
  value: unknown;
  /** Public settings are exposed to unauthenticated clients via /settings/public. */
  isPublic: boolean;
  description: string | null;
  updatedAt: string;
}

export interface UpdateSystemSettingRequest {
  value: unknown;
}

export interface PublicSettingsDto {
  brandName: string;
  brandLogoUrl: string | null;
  defaultCurrency: string;
  defaultLocale: Locale;
  supportedLocales: Locale[];
  demoMode: boolean;
  guestBrowsingEnabled: boolean;
  registrationEnabled: boolean;
  /** KPI cards rendered on the authenticated home dashboard, admin-ordered. */
  dashboardKpis: DashboardKpiConfig[];
}

export interface DashboardKpiConfig {
  key: string;
  labelCode: string;
  source: 'WALLET' | 'POINTS' | 'BONUS' | 'ORDERS' | 'MEMBERS';
  walletType?: WalletType;
  accent: 'green' | 'blue' | 'orange' | 'neutral';
  position: number;
  visible: boolean;
}

export interface TranslationDto {
  id: string;
  locale: Locale;
  namespace: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface TranslationInput {
  locale: Locale;
  namespace: string;
  key: string;
  value: string;
}

export interface TranslationQuery extends ListQuery {
  locale?: Locale;
  namespace?: string;
  /** Returns only keys that are missing a value for the requested locale. */
  missingOnly?: boolean;
}

// --- audit ------------------------------------------------------------------

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: RoleName | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogQuery extends ListQuery {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
}

// --- admin users ------------------------------------------------------------

export interface AdminUserDto {
  id: string;
  memberId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  roles: RoleName[];
  locale: Locale;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminUserQuery extends ListQuery {
  status?: UserStatus;
  role?: RoleName;
}

export interface CreateUserRequest {
  memberId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  roles: RoleName[];
  locale?: Locale;
  sponsorMemberId?: string | null;
  placementParentMemberId?: string | null;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  status?: UserStatus;
  roles?: RoleName[];
  locale?: Locale;
}
