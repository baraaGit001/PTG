import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersService } from './users.service.js';
import { MeController, ProfileController, AddressesController } from './users.controller.js';
import { AdminUsersController } from './admin-users.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [MeController, ProfileController, AddressesController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
