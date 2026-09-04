import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { OrderSummaryDto } from '@ptg/types';
import { RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { OrdersService } from './orders.service.js';
import type { FulfillmentOrderQueryDto } from './orders.dto.js';

/** Partner-facing fulfillment queue: paid orders through delivered/cancelled, filterable by courier/customer/status. */
@ApiTags('fulfillment-orders')
@Controller('fulfillment-orders')
export class FulfillmentController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions('fulfillment.read')
  async list(@Query() query: FulfillmentOrderQueryDto): Promise<PaginatedResult<OrderSummaryDto>> {
    return this.ordersService.listOrders(null, query);
  }
}
