import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { SETTING_KEYS, AUDIT_ACTIONS } from '@ptg/config';
import {
  canTransition,
  CUSTOMER_CANCELLABLE_ORDER_STATUSES,
  ORDER_TRANSITIONS,
  SHIPMENT_TRANSITIONS,
  type CheckoutQuoteDto as CheckoutQuoteDtoType,
  type CreateOrderRequest,
  type OrderDetailDto,
  type OrderStatus,
  type OrderSummaryDto,
  type ShipmentDto,
} from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { toMoney, toMinorBigInt } from '../../common/money.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CartService } from '../cart/cart.service.js';
import { InventoryService } from '../catalog/inventory.service.js';
import { WalletLedgerService } from '../wallet/wallet-ledger.service.js';
import { PointsService } from '../wallet/points.service.js';
import { ShippingService } from './shipping.service.js';
import { buildPaginationMeta, dateRangeFilter, type PaginatedResult, type PaginationQueryDto } from '../../common/dto/pagination.dto.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly inventory: InventoryService,
    private readonly ledger: WalletLedgerService,
    private readonly points: PointsService,
    private readonly shipping: ShippingService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async getCheckoutQuote(userId: string, currency: string, query: { addressId?: string; deliveryMethod?: string }): Promise<CheckoutQuoteDtoType> {
    const cartDto = await this.cart.getCart(userId, currency);
    const [address, shippingMethods] = await Promise.all([
      query.addressId ? this.prisma.address.findFirst({ where: { id: query.addressId, userId } }) : this.prisma.address.findFirst({ where: { userId, isDefault: true } }),
      this.shipping.listMethods(currency),
    ]);

    const shippingMinor = query.deliveryMethod ? await this.shipping.getPriceMinor(query.deliveryMethod as never, currency) : 0;
    const totals = {
      ...cartDto.totals,
      shipping: { amountMinor: shippingMinor, currency: currency as never },
      total: {
        amountMinor: cartDto.totals.subtotal.amountMinor - cartDto.totals.discount.amountMinor + shippingMinor + cartDto.totals.tax.amountMinor,
        currency: currency as never,
      },
    };

    return {
      cart: cartDto,
      availableShippingMethods: shippingMethods,
      availablePaymentMethods: ['E_ACCOUNT', 'BONUS_POOL', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'],
      address: address
        ? {
            id: address.id,
            recipientName: address.recipientName,
            phone: address.phone,
            country: address.country,
            region: address.region,
            city: address.city,
            district: address.district,
            street: address.street,
            postalCode: address.postalCode,
            isDefault: address.isDefault,
            createdAt: address.createdAt.toISOString(),
            updatedAt: address.updatedAt.toISOString(),
          }
        : null,
      totals,
    };
  }

  async createOrder(userId: string, currency: string, dto: CreateOrderRequest): Promise<OrderDetailDto> {
    const existingOrder = await this.prisma.order.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existingOrder) return this.getOrderDetail(existingOrder.id, userId, false);

    const address = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId } });
    if (!address) throw new ApiException('ADDRESS_NOT_FOUND', 'Shipping address not found.');

    const cartItems = await this.prisma.cartItem.findMany({
      where: { cart: { userId } },
      include: { variant: { include: { product: true, inventory: true } } },
    });
    if (cartItems.length === 0) throw new ApiException('CART_EMPTY', 'Your cart is empty.');

    for (const item of cartItems) {
      if (item.variant.product.status !== 'PUBLISHED') {
        throw new ApiException('PRODUCT_UNAVAILABLE', `${item.variant.product.name} is no longer available.`);
      }
      const available = item.variant.inventory ? item.variant.inventory.onHand - item.variant.inventory.reserved : 0;
      if (available < item.quantity) {
        throw new ApiException('INSUFFICIENT_STOCK', `Only ${available} of ${item.variant.product.name} are available.`);
      }
    }

    const orderId = randomUUID();
    const reservationKey = (variantId: string) => `order-reserve:${orderId}:${variantId}`;
    const reserved: string[] = [];
    try {
      for (const item of cartItems) {
        await this.inventory.reserve(item.variantId, item.quantity, orderId, reservationKey(item.variantId));
        reserved.push(item.variantId);
      }
    } catch (error) {
      for (const variantId of reserved) {
        await this.inventory.release(variantId, cartItems.find((i) => i.variantId === variantId)!.quantity, orderId, `${reservationKey(variantId)}:release`);
      }
      throw error;
    }

    const subtotalMinor = cartItems.reduce((acc, item) => acc + item.variant.priceMinor * BigInt(item.quantity), 0n);
    const shippingMinor = BigInt(await this.shipping.getPriceMinor(dto.deliveryMethod, currency));
    const discountMinor = 0n;
    const taxMinor = 0n;
    const totalMinor = subtotalMinor - discountMinor + shippingMinor + taxMinor;
    const pointsAwarded = cartItems.reduce((acc, item) => acc + item.variant.pointsAwarded * item.quantity, 0);
    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          id: orderId,
          orderNumber,
          userId,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'PENDING',
          currency,
          subtotalMinor,
          discountMinor,
          shippingMinor,
          taxMinor,
          totalMinor,
          deliveryMethod: dto.deliveryMethod,
          shippingAddress: {
            recipientName: address.recipientName,
            phone: address.phone,
            country: address.country,
            region: address.region,
            city: address.city,
            district: address.district,
            street: address.street,
            postalCode: address.postalCode,
          } as Prisma.InputJsonValue,
          pointsAwarded,
          note: dto.note,
          idempotencyKey: dto.idempotencyKey,
          items: {
            create: cartItems.map((item) => ({
              productId: item.variant.productId,
              productName: item.variant.product.name,
              variantId: item.variantId,
              variantName: item.variant.name,
              sku: item.variant.sku,
              imageUrl: item.variant.imageUrl,
              quantity: item.quantity,
              unitPriceMinor: item.variant.priceMinor,
              lineTotalMinor: item.variant.priceMinor * BigInt(item.quantity),
              pointsAwarded: item.variant.pointsAwarded * item.quantity,
            })),
          },
          payments: { create: { method: dto.paymentMethod, status: 'PENDING', amountMinor: totalMinor, currency } },
          timeline: { create: { code: 'ORDER_PLACED', status: 'PENDING_PAYMENT' } },
        },
      });
      await tx.cartItem.deleteMany({ where: { cart: { userId } } });
      return created;
    });

    await this.audit.record({
      actorId: userId,
      action: AUDIT_ACTIONS.orderCreated,
      entityType: 'Order',
      entityId: order.id,
      after: { orderNumber, totalMinor: totalMinor.toString(), paymentMethod: dto.paymentMethod },
    });

    if (dto.paymentMethod === 'E_ACCOUNT' || dto.paymentMethod === 'BONUS_POOL') {
      try {
        await this.capturePayment(order.id, dto.paymentMethod, Number(totalMinor), currency);
      } catch (error) {
        await this.cancelOrder(userId, order.id, { reason: 'Payment failed' }, true);
        throw error;
      }
    }

    return this.getOrderDetail(order.id, userId, false);
  }

  private async capturePayment(orderId: string, method: 'E_ACCOUNT' | 'BONUS_POOL', amountMinor: number, currency: string): Promise<void> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true } });
    const payment = order.payments[0];

    const transaction = await this.ledger.postTransaction({
      userId: order.userId,
      walletType: method,
      currency,
      type: 'ORDER_PAYMENT',
      direction: 'OUT',
      amountMinor,
      description: `Payment for order ${order.orderNumber}`,
      descriptionCode: 'ORDER_PAYMENT',
      referenceType: 'ORDER',
      referenceId: order.id,
      referenceLabel: order.orderNumber,
      idempotencyKey: `order-payment:${order.id}`,
    });

    await this.prisma.$transaction([
      this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date(), reference: transaction.id } }),
      this.prisma.paymentTransaction.create({
        data: { paymentId: payment.id, type: 'CHARGE', amountMinor: toMinorBigInt(amountMinor), status: 'PAID', idempotencyKey: `order-payment-tx:${order.id}` },
      }),
      this.prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', status: 'PAID' } }),
      this.prisma.orderTimelineEntry.create({ data: { orderId: order.id, code: 'ORDER_PAID', status: 'PAID' } }),
    ]);

    await this.awardPoints(order.id);
  }

  private async awardPoints(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.pointsAwarded <= 0) return;
    await this.points.post({
      userId: order.userId,
      type: 'EARNED',
      points: order.pointsAwarded,
      description: `Points earned from order ${order.orderNumber}`,
      descriptionCode: 'ORDER_POINTS_EARNED',
      referenceType: 'ORDER',
      referenceId: order.id,
      referenceLabel: order.orderNumber,
      idempotencyKey: `order-points:${order.id}`,
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const prefix = await this.settings.get<string>(SETTING_KEYS.orderNumberPrefix, 'PTG');
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${stamp}-${random}`;
  }

  // --- reads -----------------------------------------------------------------

  async listOrders(
    userId: string | null,
    query: PaginationQueryDto & { status?: OrderStatus; paymentStatus?: string; orderNumber?: string; courier?: string; customer?: string; shipmentStatus?: string },
  ): Promise<PaginatedResult<OrderSummaryDto>> {
    const where: Prisma.OrderWhereInput = {
      userId: userId ?? undefined,
      status: query.status,
      paymentStatus: query.paymentStatus as never,
      orderNumber: query.orderNumber ? { contains: query.orderNumber, mode: 'insensitive' } : undefined,
      placedAt: dateRangeFilter(query.from, query.to),
      user: query.customer ? { OR: [{ fullName: { contains: query.customer, mode: 'insensitive' } }, { memberId: { contains: query.customer, mode: 'insensitive' } }] } : undefined,
      shipments: query.courier || query.shipmentStatus ? { some: { courier: query.courier ? { contains: query.courier, mode: 'insensitive' } : undefined, status: query.shipmentStatus as never } } : undefined,
    };
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: { take: 1 }, _count: { select: { items: true } } },
        orderBy: { placedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        status: row.status,
        paymentStatus: row.paymentStatus,
        total: toMoney(row.totalMinor, row.currency),
        itemCount: row._count.items,
        placedAt: row.placedAt.toISOString(),
        primaryImageUrl: row.items[0]?.imageUrl ?? null,
      })),
      pagination: buildPaginationMeta({ page, pageSize }, total),
    };
  }

  async getOrderDetail(orderId: string, requesterId: string | null, isAdmin: boolean): Promise<OrderDetailDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true, shipments: true, timeline: { orderBy: { createdAt: 'asc' } }, user: { select: { id: true, memberId: true, fullName: true } } },
    });
    if (!order || (!isAdmin && requesterId && order.userId !== requesterId)) {
      throw new ApiException('ORDER_NOT_FOUND', 'Order not found.');
    }

    const address = order.shippingAddress as {
      recipientName: string; phone: string; country: string; region: string; city: string; district: string | null; street: string; postalCode: string | null;
    };

    const allowedTransitions = isAdmin
      ? [...(ORDER_TRANSITIONS[order.status] ?? [])]
      : (ORDER_TRANSITIONS[order.status] ?? []).filter((s) => s === 'CANCELLED' && CUSTOMER_CANCELLABLE_ORDER_STATUSES.includes(order.status));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: toMoney(order.totalMinor, order.currency),
      itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
      placedAt: order.placedAt.toISOString(),
      primaryImageUrl: order.items[0]?.imageUrl ?? null,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productSlug: '',
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        sku: item.sku,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        unitPrice: toMoney(item.unitPriceMinor, order.currency),
        lineTotal: toMoney(item.lineTotalMinor, order.currency),
        pointsAwarded: item.pointsAwarded,
      })),
      subtotal: toMoney(order.subtotalMinor, order.currency),
      discount: toMoney(order.discountMinor, order.currency),
      shipping: toMoney(order.shippingMinor, order.currency),
      tax: toMoney(order.taxMinor, order.currency),
      deliveryMethod: order.deliveryMethod,
      shippingAddress: {
        id: 'snapshot',
        recipientName: address.recipientName,
        phone: address.phone,
        country: address.country,
        region: address.region,
        city: address.city,
        district: address.district,
        street: address.street,
        postalCode: address.postalCode,
        isDefault: false,
        createdAt: order.placedAt.toISOString(),
        updatedAt: order.placedAt.toISOString(),
      },
      payments: order.payments.map((p) => ({
        id: p.id,
        method: p.method,
        status: p.status,
        amount: toMoney(p.amountMinor, p.currency),
        refundedAmount: toMoney(p.refundedAmountMinor, p.currency),
        reference: p.reference,
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
      shipments: order.shipments.map(toShipmentDto),
      timeline: order.timeline.map((t) => ({ id: t.id, code: t.code, status: t.status, note: t.note, actorName: null, createdAt: t.createdAt.toISOString() })),
      pointsAwarded: order.pointsAwarded,
      note: order.note,
      customer: { id: order.user.id, memberId: order.user.memberId, fullName: order.user.fullName },
      allowedTransitions,
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  // --- status transitions ------------------------------------------------------

  async transitionStatus(actorId: string, orderId: string, nextStatus: OrderStatus, note: string | undefined, isAdmin: boolean): Promise<OrderDetailDto> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new ApiException('ORDER_NOT_FOUND', 'Order not found.');
    if (!isAdmin && order.userId !== actorId) throw new ApiException('ORDER_NOT_FOUND', 'Order not found.');

    if (!canTransition(ORDER_TRANSITIONS, order.status, nextStatus)) {
      throw new ApiException('INVALID_ORDER_TRANSITION', `Cannot move an order from ${order.status} to ${nextStatus}.`);
    }
    if (!isAdmin && nextStatus !== 'CANCELLED') {
      throw new ApiException('FORBIDDEN', 'Only staff can perform this transition.');
    }

    if (nextStatus === 'CANCELLED') {
      for (const item of order.items) {
        await this.inventory.release(item.variantId, item.quantity, order.id, `order-cancel-release:${order.id}:${item.variantId}`);
      }
    }

    if (nextStatus === 'PAID' && order.paymentStatus !== 'PAID') {
      const payment = await this.prisma.payment.findFirst({ where: { orderId: order.id } });
      if (payment) {
        await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date() } });
      }
      await this.prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID' } });
      await this.awardPoints(order.id);
    }

    await this.prisma.order.update({ where: { id: orderId }, data: { status: nextStatus } });
    await this.prisma.orderTimelineEntry.create({ data: { orderId, code: `ORDER_${nextStatus}`, status: nextStatus, note, actorId } });

    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.orderStatusChanged,
      entityType: 'Order',
      entityId: orderId,
      before: { status: order.status },
      after: { status: nextStatus, note },
    });

    return this.getOrderDetail(orderId, actorId, isAdmin);
  }

  async cancelOrder(userId: string, orderId: string, dto: { reason?: string }, isSystem = false): Promise<OrderDetailDto> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ApiException('ORDER_NOT_FOUND', 'Order not found.');
    if (!isSystem && !CUSTOMER_CANCELLABLE_ORDER_STATUSES.includes(order.status)) {
      throw new ApiException('ORDER_NOT_CANCELLABLE', 'This order can no longer be cancelled.');
    }
    return this.transitionStatus(userId, orderId, 'CANCELLED', dto.reason, isSystem);
  }

  // --- shipments -----------------------------------------------------------------

  async updateShipment(actorId: string, orderId: string, dto: { status?: string; courier?: string; trackingNumber?: string; trackingUrl?: string; note?: string }): Promise<ShipmentDto> {
    let shipment = await this.prisma.shipment.findFirst({ where: { orderId } });
    if (!shipment) {
      shipment = await this.prisma.shipment.create({ data: { orderId, status: 'PENDING' } });
    }

    if (dto.status && dto.status !== shipment.status) {
      if (!canTransition(SHIPMENT_TRANSITIONS, shipment.status, dto.status as never)) {
        throw new ApiException('INVALID_SHIPMENT_TRANSITION', `Cannot move a shipment from ${shipment.status} to ${dto.status}.`);
      }
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: (dto.status as never) ?? undefined,
        courier: dto.courier,
        trackingNumber: dto.trackingNumber,
        trackingUrl: dto.trackingUrl,
        shippedAt: dto.status === 'SHIPPED' ? new Date() : undefined,
        deliveredAt: dto.status === 'DELIVERED' ? new Date() : undefined,
      },
    });

    await this.prisma.orderTimelineEntry.create({
      data: { orderId, code: 'SHIPMENT_UPDATED', note: dto.note ?? dto.trackingNumber ?? null, actorId },
    });

    if (dto.status === 'SHIPPED') {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: 'SHIPPED' } });
    } else if (dto.status === 'DELIVERED') {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: 'DELIVERED' } });
    }

    await this.audit.record({ actorId, action: AUDIT_ACTIONS.shipmentUpdated, entityType: 'Shipment', entityId: updated.id, after: dto });
    return toShipmentDto(updated);
  }

  // --- refunds -----------------------------------------------------------------

  async refundOrder(actorId: string, orderId: string, dto: { amountMinor?: number; reason: string; idempotencyKey: string }): Promise<OrderDetailDto> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) throw new ApiException('ORDER_NOT_FOUND', 'Order not found.');
    const payment = order.payments[0];
    if (!payment || (payment.status !== 'PAID' && payment.status !== 'PARTIALLY_REFUNDED')) {
      throw new ApiException('ORDER_ALREADY_PAID', 'This order has no capturable payment to refund.');
    }

    const refundable = payment.amountMinor - payment.refundedAmountMinor;
    const amountMinor = dto.amountMinor != null ? toMinorBigInt(dto.amountMinor) : refundable;
    if (amountMinor > refundable) throw new ApiException('REFUND_EXCEEDS_PAID_AMOUNT', 'The refund amount exceeds the amount available to refund.');
    if (amountMinor <= 0n) throw new ApiException('ALREADY_REFUNDED', 'This payment has already been fully refunded.');

    if (payment.method === 'E_ACCOUNT' || payment.method === 'BONUS_POOL') {
      await this.ledger.postTransaction({
        userId: order.userId,
        walletType: payment.method,
        currency: order.currency,
        type: 'ORDER_REFUND',
        direction: 'IN',
        amountMinor: Number(amountMinor),
        description: `Refund for order ${order.orderNumber}: ${dto.reason}`,
        descriptionCode: 'ORDER_REFUND',
        referenceType: 'ORDER',
        referenceId: order.id,
        referenceLabel: order.orderNumber,
        idempotencyKey: dto.idempotencyKey,
      });
    }

    const newRefunded = payment.refundedAmountMinor + amountMinor;
    const newPaymentStatus = newRefunded >= payment.amountMinor ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await this.prisma.$transaction([
      this.prisma.payment.update({ where: { id: payment.id }, data: { refundedAmountMinor: newRefunded, status: newPaymentStatus } }),
      this.prisma.paymentTransaction.create({
        data: { paymentId: payment.id, type: 'REFUND', amountMinor, status: newPaymentStatus, idempotencyKey: dto.idempotencyKey, reason: dto.reason },
      }),
      this.prisma.order.update({ where: { id: orderId }, data: { paymentStatus: newPaymentStatus, status: newPaymentStatus === 'REFUNDED' ? 'REFUNDED' : order.status } }),
      this.prisma.orderTimelineEntry.create({ data: { orderId, code: 'ORDER_REFUNDED', note: dto.reason, actorId } }),
    ]);

    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.orderRefunded,
      entityType: 'Order',
      entityId: orderId,
      after: { amountMinor: amountMinor.toString(), reason: dto.reason },
    });

    return this.getOrderDetail(orderId, actorId, true);
  }
}

function toShipmentDto(shipment: {
  id: string; status: string; courier: string | null; trackingNumber: string | null; trackingUrl: string | null; shippedAt: Date | null; deliveredAt: Date | null; createdAt: Date;
}): ShipmentDto {
  return {
    id: shipment.id,
    status: shipment.status as ShipmentDto['status'],
    courier: shipment.courier,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    shippedAt: shipment.shippedAt?.toISOString() ?? null,
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
    createdAt: shipment.createdAt.toISOString(),
  };
}
