import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module.js';
import { InvestmentService } from './investment.service.js';
import { InvestmentController, AdminInvestmentController } from './investment.controller.js';

@Module({
  imports: [WalletModule],
  controllers: [InvestmentController, AdminInvestmentController],
  providers: [InvestmentService],
})
export class InvestmentModule {}
