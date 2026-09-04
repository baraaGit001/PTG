import type { Money } from '../money.js';
import type {
  AdjustmentRequestStatus,
  BonusRecordStatus,
  BonusRuleType,
  PointTransactionType,
  ReferenceType,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
  WalletStatus,
  WalletType,
} from '../enums.js';
import type { ListQuery } from '../envelope.js';

export interface WalletDto {
  id: string;
  type: WalletType;
  status: WalletStatus;
  /**
   * Cached projection of the ledger. The ledger (WalletTransaction) remains the
   * source of truth; this value is recomputed inside the same database
   * transaction that appends each entry.
   */
  balance: Money;
  /** Funds committed to pending orders and not spendable. */
  reserved: Money;
  available: Money;
  allowNegative: boolean;
  updatedAt: string;
}

export interface TransactionReferenceDto {
  type: ReferenceType;
  id: string | null;
  /** Human-readable label, e.g. an order number. */
  label: string | null;
}

export interface WalletTransactionDto {
  id: string;
  walletId: string;
  walletType: WalletType;
  type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  amount: Money;
  /** Running balance immediately after this entry was posted. */
  balanceAfter: Money;
  description: string;
  /** Stable code the client translates; `description` is only a fallback. */
  descriptionCode: string | null;
  reference: TransactionReferenceDto | null;
  reversalOfId: string | null;
  createdAt: string;
  postedAt: string | null;
}

export interface WalletTransactionQuery extends ListQuery {
  type?: TransactionType;
  status?: TransactionStatus;
  direction?: TransactionDirection;
  referenceType?: ReferenceType;
}

export interface WalletSummaryDto {
  wallets: WalletDto[];
  /** Points are whole units and tracked separately from monetary wallets. */
  personalPoints: number;
}

export interface PointTransactionDto {
  id: string;
  type: PointTransactionType;
  /** Signed integer: positive adds points, negative removes them. */
  points: number;
  balanceAfter: number;
  description: string;
  descriptionCode: string | null;
  reference: TransactionReferenceDto | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PointTransactionQuery extends ListQuery {
  type?: PointTransactionType;
}

export interface PointSummaryDto {
  balance: number;
  earnedInPeriod: number;
  spentInPeriod: number;
  expiringSoon: number;
  expiringSoonAt: string | null;
}

// --- bonus -----------------------------------------------------------------

export interface BonusRuleDto {
  id: string;
  name: string;
  code: string;
  type: BonusRuleType;
  description: string | null;
  active: boolean;
  /** Rule-specific parameters. Interpreted only by the matching calculator. */
  configuration: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BonusRuleInput {
  name: string;
  code: string;
  type: BonusRuleType;
  description?: string | null;
  active: boolean;
  configuration: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface BonusRecordDto {
  id: string;
  memberId: string;
  memberName: string;
  rule: { id: string; name: string; code: string; type: BonusRuleType };
  amount: Money;
  status: BonusRecordStatus;
  source: TransactionReferenceDto | null;
  /** Inputs the calculator used, retained so every payout stays auditable. */
  calculationBasis: Record<string, unknown> | null;
  walletTransactionId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface BonusRecordQuery extends ListQuery {
  status?: BonusRecordStatus;
  ruleCode?: string;
  memberId?: string;
}

export interface BonusSummaryDto {
  totalEarned: Money;
  totalPending: Money;
  totalPaid: Money;
  recordCount: number;
  byRule: Array<{ ruleCode: string; ruleName: string; amount: Money; count: number }>;
}

// --- admin adjustments ------------------------------------------------------

export interface WalletAdjustmentRequestDto {
  id: string;
  walletId: string;
  walletType: WalletType;
  memberId: string;
  memberName: string;
  amount: Money;
  direction: TransactionDirection;
  reason: string;
  status: AdjustmentRequestStatus;
  requestedBy: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
  reviewNote: string | null;
  walletTransactionId: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface CreateWalletAdjustmentRequest {
  userId: string;
  walletType: WalletType;
  /** Absolute value in minor units; `direction` decides the sign. */
  amountMinor: number;
  currency: string;
  direction: TransactionDirection;
  /** Mandatory - a financial mutation is never recorded without a reason. */
  reason: string;
  /** Required so a retried request never double-posts. */
  idempotencyKey: string;
}

export interface ReviewWalletAdjustmentRequest {
  decision: 'APPROVE' | 'REJECT';
  note?: string;
}

export interface TransferRequest {
  toMemberId: string;
  walletType: WalletType;
  amountMinor: number;
  currency: string;
  note?: string;
  idempotencyKey: string;
}
