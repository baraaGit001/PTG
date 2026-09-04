import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { SUPPORTED_LOCALES, type Locale, type TranslationDto } from '@ptg/types';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { LocalizationService } from './localization.service.js';

class UpsertTranslationDto {
  @IsIn(SUPPORTED_LOCALES)
  locale!: Locale;

  @IsString()
  namespace!: string;

  @IsString()
  key!: string;

  @IsString()
  value!: string;
}

class TranslationQueryDto {
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: Locale;

  @IsOptional()
  @IsString()
  namespace?: string;

  @IsOptional()
  @IsBoolean()
  missingOnly?: boolean;
}

@ApiTags('i18n')
@Controller('i18n')
export class LocalizationController {
  constructor(private readonly localization: LocalizationService) {}

  @Public()
  @Get(':locale')
  async bundle(@Param('locale') locale: string): Promise<Record<string, Record<string, string>>> {
    return this.localization.getBundle(locale);
  }
}

@ApiTags('admin/localization')
@Controller('admin/localization')
export class AdminLocalizationController {
  constructor(private readonly localization: LocalizationService) {}

  @Get('translations')
  @RequirePermissions('localization.manage')
  async list(@Query() query: TranslationQueryDto): Promise<TranslationDto[]> {
    return this.localization.adminList(query);
  }

  @Post('translations')
  @RequirePermissions('localization.manage')
  async upsert(@CurrentUser() actor: RequestUser, @Body() dto: UpsertTranslationDto): Promise<TranslationDto> {
    return this.localization.upsert(actor.id, dto);
  }
}
