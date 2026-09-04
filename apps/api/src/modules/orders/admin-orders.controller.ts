import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { OrderDetailDto, OrderSummaryDto, ShipmentDto } from '@ptg/types';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import type { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { OrdersService } from './orders.service.js';
import type { OrderListQueryDto, RefundOrderDto, UpdateOrderStatusDto, UpdateShipmentDto } from './orders.dto.js';

@ApiTags('admin/orders')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions('orders.read.any')
  async list(@Query() query: OrderListQueryDto): Promise<PaginatedResult<OrderSummaryDto>> {
    return this.ordersService.listOrders(null, query);
  }

  @Get(':id')
  @RequirePermissions('orders.read.any')
  async detail(@Param('id') id: string): Promise<OrderDetailDto> {
    return this.ordersService.getOrderDetail(id, null, true);
  }

  @Patch(':id/status')
  @RequirePermissions('orders.manage')
  async updateStatus(@CurrentUser() actor: RequestUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto): Promise<OrderDetailDto> {
    return this.ordersService.transitionStatus(actor.id, id, dto.status, dto.note, true);
  }

  @Patch(':id/shipment')
  @RequirePermissions('fulfillment.manage')
  async updateShipment(@CurrentUser() actor: RequestUser, @Param('id') id: string, @Body() dto: UpdateShipmentDto): Promise<ShipmentDto> {
    return this.ordersService.updateShipment(actor.id, id, dto);
  }

  @Post(':id/refund')
  @RequirePermissions('orders.refund')
  async refund(@CurrentUser() actor: RequestUser, @Param('id') id: string, @Body() dto: RefundOrderDto): Promise<OrderDetailDto> {
    return this.ordersService.refundOrder(actor.id, id, dto);
  }
}
