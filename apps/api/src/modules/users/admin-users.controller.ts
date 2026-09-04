import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AdminUserDto } from '@ptg/types';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { UsersService } from './users.service.js';
import { AdminUserQueryDto, CreateUserDto, UpdateUserDto } from './users.dto.js';

@ApiTags('admin/users')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  async list(@Query() query: AdminUserQueryDto): Promise<PaginatedResult<AdminUserDto>> {
    return this.usersService.adminListUsers(query);
  }

  @Post()
  @RequirePermissions('users.manage')
  async create(@CurrentUser() actor: RequestUser, @Body() dto: CreateUserDto): Promise<AdminUserDto> {
    return this.usersService.adminCreateUser(actor.id, dto);
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  async update(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<AdminUserDto> {
    return this.usersService.adminUpdateUser(actor.id, id, dto);
  }
}
