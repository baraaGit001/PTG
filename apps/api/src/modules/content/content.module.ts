import { Module } from '@nestjs/common';
import { ContentService } from './content.service.js';
import { ContentController, AdminContentController } from './content.controller.js';

@Module({
  controllers: [ContentController, AdminContentController],
  providers: [ContentService],
})
export class ContentModule {}
