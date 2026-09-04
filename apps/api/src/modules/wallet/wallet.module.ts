import { Module } from '@nestjs/common';
import { WalletLedgerService } from './wallet-ledger.service.js';
import { PointsService } from './points.service.js';
import { BonusService } from './bonus.service.js';
import { AdjustmentsService } from './adjustments.service.js';
import { WalletController, PointsController, BonusesController } from './wallet.controller.js';
import { AdminWalletController, AdminBonusRulesController, AdminBonusRecordsController } from './admin-wallet.controller.js';

@Module({
  controllers: [
    WalletController,
    PointsController,
    BonusesController,
    AdminWalletController,
    AdminBonusRulesController,
    AdminBonusRecordsController,
  ],
  providers: [WalletLedgerService, PointsService, BonusService, AdjustmentsService],
  exports: [WalletLedgerService, PointsService, BonusService, AdjustmentsService],
})
export class WalletModule {}
