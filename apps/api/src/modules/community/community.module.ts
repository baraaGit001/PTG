import { Module } from '@nestjs/common';
import { CommunityService } from './community.service.js';
import { CommunityController, AdminCommunityController } from './community.controller.js';

@Module({
  controllers: [CommunityController, AdminCommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
