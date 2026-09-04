import { Module } from '@nestjs/common';
import { MembersService } from './members.service.js';
import { MembersController, AdminMembersController } from './members.controller.js';

@Module({
  controllers: [MembersController, AdminMembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
