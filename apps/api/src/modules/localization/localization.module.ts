import { Module } from '@nestjs/common';
import { LocalizationService } from './localization.service.js';
import { LocalizationController, AdminLocalizationController } from './localization.controller.js';

@Module({
  controllers: [LocalizationController, AdminLocalizationController],
  providers: [LocalizationService],
})
export class LocalizationModule {}
