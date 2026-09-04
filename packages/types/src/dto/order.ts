import type { Money } from '../money.js';
import type { ListQuery } from '../envelope.js';
import type {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShipmentStatus,
  StockStatus,
} from '../enums.js';
import type { AddressDto } from './member.js';

// --- cart -------------------------------------------------------------------

export interface CartItemDto {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  /** Server-resolved unit price at read time. Client totals are never trusted. */
  unitPrice: Money;
  lineTotal: Money;
  stockStatus: StockStatus;
  /** Set when the catalogue price moved since the item was added. */
  priceChangedFrom: Money | null;
  availableQuantity: number | null;
}

export interface CartTotalsDto {
  subtotal: Money;
  discount: Money;
  shipping: Money;
  tax: Money;
  total: Money;
  /** Points that would be granted if the cart is checked out as-is. */
  pointsAwarded: number;
  itemCount: number;
}

export interface CartDto {
  id: string;
  items: CartItemDto[];
  totals: CartTotalsDto;
  currency: string;
  /** Codes describing blocking problems, e.g. INSUFFICIENT_STOCK. */
  issues: Array<{ code: string; itemId: string | null; message: string }>;
  updatedAt: string;
}

export interface AddCartItemRequest {
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

// --- checkout ---------------------------------------------------------------

export interface ShippingMethodDto {
  id: string;
  code: DeliveryMethod;
  name: string;
  description: string | null;
  price: Money;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

export interface CheckoutQuoteRequest {
  addressId?: string;
  deliveryMethod?: DeliveryMethod;
  promotionCode?: string;
}

export interface CheckoutQuoteDto {
  cart: CartDto;
  availableShippingMethods: ShippingMethodDto[];
  availablePaymentMethods: PaymentMethod[];
  address: AddressDto | null;
  totals: CartTotalsDto;
}

export interface CreateOrderRequest {
  addressId: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  promotionCode?: string;
  note?: string;
  /** Required: prevents a double-submitted checkout creating two orders. */
  idempotencyKey: string;
}

// --- orders -----------------------------------------------------------------

export interface OrderItemDto {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  pointsAwarded: number;
}

export interface OrderTimelineEntryDto {
  id: string;
  /** Stable code the client translates, e.g. ORDER_PAID. */
  code: string;
  status: OrderStatus | null;
  note: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: Money;
  refundedAmount: Money;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface ShipmentDto {
  id: string;
  status: ShipmentStatus;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface OrderSummaryDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: Money;
  itemCount: number;
  placedAt: string;
  primaryImageUrl: string | null;
}

export interface OrderDetailDto extends OrderSummaryDto {
  items: OrderItemDto[];
  subtotal: Money;
  discount: Money;
  shipping: Money;
  tax: Money;
  deliveryMethod: DeliveryMethod;
  /** Snapshot taken at checkout - later address edits never rewrite history. */
  shippingAddress: AddressDto;
  payments: PaymentDto[];
  shipments: ShipmentDto[];
  timeline: OrderTimelineEntryDto[];
  pointsAwarded: number;
  note: string | null;
  customer: { id: string; memberId: string; fullName: string };
  /** Transitions the caller is currently permitted to perform. */
  allowedTransitions: OrderStatus[];
  updatedAt: string;
}

export interface OrderListQuery extends ListQuery {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  orderNumber?: string;
}

export interface FulfillmentOrderQuery extends OrderListQuery {
  courier?: string;
  customer?: string;
  shipmentStatus?: ShipmentStatus;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  note?: string;
}

export interface UpdateShipmentRequest {
  status?: ShipmentStatus;
  courier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  note?: string;
}

export interface RefundOrderRequest {
  /** Omit to refund the full paid amount. */
  amountMinor?: number;
  reason: string;
  idempotencyKey: string;
}

export interface CancelOrderRequest {
  reason?: string;
}
