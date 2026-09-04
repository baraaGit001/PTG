import { Global, Module } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { SettingsController, AdminSettingsController } from './settings.controller.js';

@Global()
@Module({
  controllers: [SettingsController, AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
