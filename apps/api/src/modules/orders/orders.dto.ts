import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { DELIVERY_METHODS, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, SHIPMENT_STATUSES, type DeliveryMethod, type OrderStatus, type PaymentMethod, type PaymentStatus, type ShipmentStatus } from '@ptg/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class CheckoutQuoteDto {
  @IsOptional()
  @IsString()
  addressId?: string;

  @IsOptional()
  @IsIn(DELIVERY_METHODS)
  deliveryMethod?: DeliveryMethod;

  @IsOptional()
  @IsString()
  promotionCode?: string;
}

export class CreateOrderDto {
  @IsString()
  addressId!: string;

  @IsIn(DELIVERY_METHODS)
  deliveryMethod!: DeliveryMethod;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  promotionCode?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  idempotencyKey!: string;
}

export class OrderListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  orderNumber?: string;
}

export class FulfillmentOrderQueryDto extends OrderListQueryDto {
  @IsOptional()
  @IsString()
  courier?: string;

  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsIn(SHIPMENT_STATUSES)
  shipmentStatus?: ShipmentStatus;
}

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateShipmentDto {
  @IsOptional()
  @IsIn(SHIPMENT_STATUSES)
  status?: ShipmentStatus;

  @IsOptional()
  @IsString()
  courier?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RefundOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amountMinor?: number;

  @IsString()
  reason!: string;

  @IsString()
  idempotencyKey!: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
