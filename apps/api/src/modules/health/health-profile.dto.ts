import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ACTIVITY_LEVELS, GENDERS, HEALTH_GOALS } from '@ptg/types';

export class UpdateHealthProfileDto {
  @IsOptional()
  @IsIn(GENDERS)
  gender?: (typeof GENDERS)[number];

  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(260)
  heightCm?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(400000)
  weightGrams?: number | null;

  @IsOptional()
  @IsIn(ACTIVITY_LEVELS)
  activityLevel?: (typeof ACTIVITY_LEVELS)[number];

  @IsOptional()
  @IsIn(HEALTH_GOALS)
  goal?: (typeof HEALTH_GOALS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  targetWeightGrams?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
