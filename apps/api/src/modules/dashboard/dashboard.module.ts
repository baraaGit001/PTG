import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PromotionsModule } from '../promotions/promotions.module.js';
import { DashboardService } from './dashboard.service.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { DashboardController, AdminDashboardController } from './dashboard.controller.js';

@Module({
  imports: [WalletModule, OrdersModule, PromotionsModule],
  controllers: [DashboardController, AdminDashboardController],
  providers: [DashboardService, AdminDashboardService],
})
export class DashboardModule {}
