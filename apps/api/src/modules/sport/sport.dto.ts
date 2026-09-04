import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RANKING_PERIODS, SPORT_METRIC_UNITS, type RankingPeriod, type SportMetricUnit } from '@ptg/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class SubmitScoreDto {
  @IsString()
  metricCode!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  value!: number;

  @IsString()
  recordedFor!: string;
}

export class RankingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(RANKING_PERIODS)
  period?: RankingPeriod;

  @IsOptional()
  @IsString()
  metricCode?: string;
}

export class SportMetricInputDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsIn(SPORT_METRIC_UNITS)
  unit!: SportMetricUnit;

  @Type(() => Number)
  @IsInt()
  scoreWeightMilli!: number;

  active!: boolean;
}
