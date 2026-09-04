import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import type { PublicSettingsDto, SystemSettingDto } from '@ptg/types';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { SettingsService } from './settings.service.js';

class UpdateSettingDto {
  @IsDefined()
  value!: unknown;
}

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  async publicSettings(): Promise<PublicSettingsDto> {
    return this.settingsService.getPublicSettings();
  }
}

@ApiTags('admin/settings')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  async list(): Promise<SystemSettingDto[]> {
    return this.settingsService.adminList();
  }

  @Put(':key')
  @RequirePermissions('settings.manage')
  async update(
    @CurrentUser() actor: RequestUser,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ): Promise<SystemSettingDto> {
    this.settingsService.assertKeyKnown(key);
    return this.settingsService.adminUpdate(actor.id, key, dto.value);
  }
}
