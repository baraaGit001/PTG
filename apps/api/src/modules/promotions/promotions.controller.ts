import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { PROMOTION_STATUSES, type PromotionDto, type PromotionStatus } from '@ptg/types';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { PaginationQueryDto, type PaginatedResult } from '../../common/dto/pagination.dto.js';
import { PromotionsService } from './promotions.service.js';

class PromotionInputDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  regions?: string[];

  @IsIn(PROMOTION_STATUSES)
  status!: PromotionStatus;

  @IsString()
  startAt!: string;

  @IsOptional()
  @IsString()
  endAt?: string | null;

  @IsOptional()
  @IsString()
  linkPath?: string;

  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  position?: number;
}

class AdminPromotionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  region?: string;
}

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Public()
  @Get()
  async list(@Query('region') region?: string): Promise<PromotionDto[]> {
    return this.promotions.listActive(region);
  }
}

@ApiTags('admin/promotions')
@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  @RequirePermissions('promotions.read')
  async list(@Query() query: AdminPromotionQueryDto): Promise<PaginatedResult<PromotionDto>> {
    return this.promotions.adminList(query);
  }

  @Post()
  @RequirePermissions('promotions.manage')
  async create(@CurrentUser() actor: RequestUser, @Body() dto: PromotionInputDto): Promise<PromotionDto> {
    return this.promotions.create(actor.id, dto);
  }

  @Patch(':id')
  @RequirePermissions('promotions.manage')
  async update(@CurrentUser() actor: RequestUser, @Param('id') id: string, @Body() dto: Partial<PromotionInputDto>): Promise<PromotionDto> {
    return this.promotions.update(actor.id, id, dto);
  }
}
