import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AddressDto, AuthenticatedUser } from '@ptg/types';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { UsersService } from './users.service.js';
import type { AddressInputDto, UpdateProfileDto } from './users.dto.js';

@ApiTags('me')
@Controller()
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: RequestUser): Promise<AuthenticatedUser> {
    return this.usersService.getAuthenticatedUser(user.id);
  }
}

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async get(@CurrentUser() user: RequestUser): Promise<AuthenticatedUser> {
    return this.usersService.getAuthenticatedUser(user.id);
  }

  @Patch()
  async update(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto): Promise<AuthenticatedUser> {
    return this.usersService.updateProfile(user.id, dto);
  }
}

@ApiTags('addresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser): Promise<AddressDto[]> {
    return this.usersService.listAddresses(user.id);
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: AddressInputDto): Promise<AddressDto> {
    return this.usersService.createAddress(user.id, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: Partial<AddressInputDto>,
  ): Promise<AddressDto> {
    return this.usersService.updateAddress(user.id, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.usersService.deleteAddress(user.id, id);
    return { ok: true };
  }

  @Post(':id/default')
  async setDefault(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<AddressDto> {
    return this.usersService.setDefaultAddress(user.id, id);
  }
}
