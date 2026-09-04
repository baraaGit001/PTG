import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { RankingResponse, SportMetricDto, SportScoreDto } from '@ptg/types';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { paginationArgs, buildPaginationMeta, type PaginatedResult } from '../../common/dto/pagination.dto.js';
import { SportService } from './sport.service.js';
import { RankingQueryDto, SportMetricInputDto, SubmitScoreDto } from './sport.dto.js';

@ApiTags('sport')
@Controller('sport')
export class SportController {
  constructor(private readonly sport: SportService) {}

  @Public()
  @Get('metrics')
  async metrics(): Promise<SportMetricDto[]> {
    return this.sport.listMetrics(true);
  }

  @Post('scores')
  async submitScore(@CurrentUser() user: RequestUser, @Body() dto: SubmitScoreDto): Promise<SportScoreDto> {
    return this.sport.submitScore(user.id, dto.metricCode, dto.value, dto.recordedFor);
  }

  @Get('scores')
  async myScores(@CurrentUser() user: RequestUser, @Query() query: PaginationQueryDto): Promise<PaginatedResult<SportScoreDto>> {
    const { skip, take } = paginationArgs(query);
    const { items, total } = await this.sport.listMyScores(user.id, { skip, take });
    return { items, pagination: buildPaginationMeta(query, total) };
  }

  @Public()
  @Get('ranking')
  async ranking(@CurrentUser() user: RequestUser | undefined, @Query() query: RankingQueryDto): Promise<RankingResponse> {
    return this.sport.getRanking(user?.id ?? '', query.period ?? 'WEEKLY', query.metricCode, query.pageSize ?? 20);
  }
}

@ApiTags('admin/sport')
@Controller('admin/sport/metrics')
export class AdminSportController {
  constructor(private readonly sport: SportService) {}

  @Get()
  @RequirePermissions('sport.manage')
  async list(): Promise<SportMetricDto[]> {
    return this.sport.listMetrics(false);
  }

  @Post()
  @RequirePermissions('sport.manage')
  async upsert(@Body() dto: SportMetricInputDto): Promise<SportMetricDto> {
    return this.sport.upsertMetric(dto);
  }
}
