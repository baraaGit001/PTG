import type {
  BonusRecordStatus,
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
  TransactionStatus,
  MembershipStatus,
  UserStatus,
} from '@ptg/types';
import { Badge, type BadgeProps } from '../primitives/badge.js';

type KnownStatus =
  | OrderStatus
  | PaymentStatus
  | ShipmentStatus
  | TransactionStatus
  | BonusRecordStatus
  | MembershipStatus
  | UserStatus
  | string;

/**
 * Maps every domain status enum to a badge tone. Falls back to `secondary`
 * for anything unrecognised so a new enum value never renders unstyled.
 */
const STATUS_TONE: Record<string, BadgeProps['variant']> = {
  // orders
  DRAFT: 'secondary',
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  PROCESSING: 'info',
  PACKED: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
  REFUNDED: 'secondary',
  PARTIALLY_REFUNDED: 'warning',
  // payments / transactions
  PENDING: 'warning',
  AUTHORIZED: 'info',
  FAILED: 'destructive',
  POSTED: 'success',
  REVERSED: 'destructive',
  // bonus
  APPROVED: 'info',
  REJECTED: 'destructive',
  // membership / users
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  TERMINATED: 'destructive',
  SUSPENDED: 'destructive',
  CLOSED: 'secondary',
  // shipment
  IN_TRANSIT: 'info',
  RETURNED: 'warning',
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: KnownStatus;
  /** i18n-resolved label; falls back to a humanized status code. */
  label?: string;
}

export function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  const variant = STATUS_TONE[status] ?? 'secondary';
  const text = label ?? status.replace(/_/g, ' ').toLowerCase();
  return (
    <Badge variant={variant} className={className} {...props}>
      <span className="capitalize">{text}</span>
    </Badge>
  );
}
