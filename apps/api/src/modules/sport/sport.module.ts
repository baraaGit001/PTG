import { Module } from '@nestjs/common';
import { SportService } from './sport.service.js';
import { SportController, AdminSportController } from './sport.controller.js';

@Module({
  controllers: [SportController, AdminSportController],
  providers: [SportService],
})
export class SportModule {}
