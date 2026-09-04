import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { CheckoutQuoteDto, OrderDetailDto, OrderSummaryDto } from '@ptg/types';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import type { AppConfig } from '../../config/configuration.js';
import type { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { OrdersService } from './orders.service.js';
import type { CancelOrderDto, CreateOrderDto, OrderListQueryDto } from './orders.dto.js';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Get('quote')
  async quote(
    @CurrentUser() user: RequestUser,
    @Query('addressId') addressId?: string,
    @Query('deliveryMethod') deliveryMethod?: string,
  ): Promise<CheckoutQuoteDto> {
    const currency = this.config.get('platform', { infer: true }).defaultCurrency;
    return this.ordersService.getCheckoutQuote(user.id, currency, { addressId, deliveryMethod });
  }
}

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto): Promise<OrderDetailDto> {
    const currency = this.config.get('platform', { infer: true }).defaultCurrency;
    return this.ordersService.createOrder(user.id, currency, dto);
  }

  @Get()
  async list(@CurrentUser() user: RequestUser, @Query() query: OrderListQueryDto): Promise<PaginatedResult<OrderSummaryDto>> {
    return this.ordersService.listOrders(user.id, query);
  }

  @Get(':id')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<OrderDetailDto> {
    return this.ordersService.getOrderDetail(id, user.id, false);
  }

  @Post(':id/cancel')
  async cancel(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CancelOrderDto): Promise<OrderDetailDto> {
    return this.ordersService.cancelOrder(user.id, id, dto);
  }
}
