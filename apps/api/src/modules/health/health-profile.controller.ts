import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { HealthProfileDto } from '@ptg/types';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { HealthProfileService } from './health-profile.service.js';
import type { UpdateHealthProfileDto } from './health-profile.dto.js';

@ApiTags('health')
@Controller('health/profile')
export class HealthProfileController {
  constructor(private readonly service: HealthProfileService) {}

  @Get()
  async get(@CurrentUser() user: RequestUser): Promise<HealthProfileDto> {
    return this.service.get(user.id);
  }

  @Put()
  async update(@CurrentUser() user: RequestUser, @Body() dto: UpdateHealthProfileDto): Promise<HealthProfileDto> {
    return this.service.update(user.id, dto);
  }
}
