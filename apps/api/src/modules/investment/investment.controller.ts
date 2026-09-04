import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, IsPositive, IsString } from 'class-validator';
import { INVESTMENT_PLAN_STATUSES, type InvestmentEnrollmentDto, type InvestmentPlanDto, type InvestmentPlanStatus } from '@ptg/types';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { InvestmentService } from './investment.service.js';

class InvestmentPlanInputDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  minimumAmountMinor!: number;

  @IsOptional()
  @IsInt()
  maximumAmountMinor?: number | null;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsInt()
  termDays?: number | null;

  @IsOptional()
  @IsString()
  riskLabel?: string;

  @IsIn(INVESTMENT_PLAN_STATUSES)
  status!: InvestmentPlanStatus;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}

class EnrollDto {
  @IsInt()
  @IsPositive()
  amountMinor!: number;

  @IsString()
  idempotencyKey!: string;
}

@ApiTags('investment')
@Controller('investment-plans')
export class InvestmentController {
  constructor(private readonly investment: InvestmentService) {}

  @Public()
  @Get()
  async list(): Promise<InvestmentPlanDto[]> {
    return this.investment.listOpenPlans();
  }

  @Get('enrollments')
  async myEnrollments(@CurrentUser() user: RequestUser): Promise<InvestmentEnrollmentDto[]> {
    return this.investment.listMyEnrollments(user.id);
  }

  @Post(':id/enroll')
  async enroll(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: EnrollDto): Promise<InvestmentEnrollmentDto> {
    return this.investment.enroll(user.id, id, dto.amountMinor, dto.idempotencyKey);
  }
}

@ApiTags('admin/investment-plans')
@Controller('admin/investment-plans')
export class AdminInvestmentController {
  constructor(private readonly investment: InvestmentService) {}

  @Get()
  @RequirePermissions('investment.read')
  async list(): Promise<InvestmentPlanDto[]> {
    return this.investment.adminListPlans();
  }

  @Post()
  @RequirePermissions('investment.manage')
  async create(@CurrentUser() actor: RequestUser, @Body() dto: InvestmentPlanInputDto): Promise<InvestmentPlanDto> {
    return this.investment.createPlan(actor.id, dto);
  }

  @Patch(':id')
  @RequirePermissions('investment.manage')
  async update(@CurrentUser() actor: RequestUser, @Param('id') id: string, @Body() dto: Partial<InvestmentPlanInputDto>): Promise<InvestmentPlanDto> {
    return this.investment.updatePlan(actor.id, id, dto);
  }
}
