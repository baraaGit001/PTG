import type {
  BonusRecordStatus,
  InvestmentEnrollmentStatus,
  OrderStatus,
  PaymentStatus,
  PromotionStatus,
  ShipmentStatus,
} from './enums.js';

/**
 * Explicit state machines. The API rejects any transition that is not listed
 * here; both the backend services and the admin UI read from these tables so
 * the allowed actions can never drift apart.
 */
export type TransitionMap<TState extends string> = Readonly<Record<TState, readonly TState[]>>;

export const ORDER_TRANSITIONS: TransitionMap<OrderStatus> = {
  DRAFT: ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'REFUNDED', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export const PAYMENT_TRANSITIONS: TransitionMap<PaymentStatus> = {
  PENDING: ['AUTHORIZED', 'PAID', 'FAILED'],
  AUTHORIZED: ['PAID', 'FAILED'],
  PAID: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  FAILED: ['PENDING'],
  PARTIALLY_REFUNDED: ['REFUNDED'],
  REFUNDED: [],
};

export const SHIPMENT_TRANSITIONS: TransitionMap<ShipmentStatus> = {
  PENDING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['IN_TRANSIT', 'DELIVERED', 'RETURNED'],
  IN_TRANSIT: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
};

export const PROMOTION_TRANSITIONS: TransitionMap<PromotionStatus> = {
  DRAFT: ['SCHEDULED', 'ACTIVE', 'ARCHIVED'],
  SCHEDULED: ['ACTIVE', 'DRAFT', 'ARCHIVED'],
  ACTIVE: ['ENDED', 'ARCHIVED'],
  ENDED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const BONUS_RECORD_TRANSITIONS: TransitionMap<BonusRecordStatus> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID', 'REJECTED'],
  PAID: ['REVERSED'],
  REJECTED: [],
  REVERSED: [],
};

export const INVESTMENT_ENROLLMENT_TRANSITIONS: TransitionMap<InvestmentEnrollmentStatus> = {
  PENDING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['MATURED', 'CANCELLED'],
  MATURED: [],
  CANCELLED: [],
};

export function canTransition<TState extends string>(
  map: TransitionMap<TState>,
  from: TState,
  to: TState,
): boolean {
  return (map[from] ?? []).includes(to);
}

export function nextStates<TState extends string>(
  map: TransitionMap<TState>,
  from: TState,
): readonly TState[] {
  return map[from] ?? [];
}

/** Order statuses at which a customer-initiated cancellation is still possible. */
export const CUSTOMER_CANCELLABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
];

/** Order statuses that the partner fulfillment queue operates on. */
export const FULFILLMENT_ORDER_STATUSES: readonly OrderStatus[] = [
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];
