import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { OrdersService } from './orders.service.js';
import { ShippingService } from './shipping.service.js';
import { CheckoutController, OrdersController } from './orders.controller.js';
import { FulfillmentController } from './fulfillment.controller.js';
import { AdminOrdersController } from './admin-orders.controller.js';

@Module({
  imports: [CartModule, CatalogModule, WalletModule],
  controllers: [CheckoutController, OrdersController, FulfillmentController, AdminOrdersController],
  providers: [OrdersService, ShippingService],
  exports: [OrdersService],
})
export class OrdersModule {}
