import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WALLET_TYPES, type BonusRecordDto, type BonusRuleDto, type WalletAdjustmentRequestDto, type WalletTransactionDto, type WalletType } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { PaginationQueryDto, paginationArgs, buildPaginationMeta, dateRangeFilter, type PaginatedResult } from '../../common/dto/pagination.dto.js';
import { AdjustmentsService } from './adjustments.service.js';
import { BonusService } from './bonus.service.js';
import { WalletLedgerService } from './wallet-ledger.service.js';
import { WalletTransactionQueryDto } from './wallet.dto.js';
import {
  BonusRuleInputDto,
  CreateAdjustmentDto,
  CreateBonusRecordDto,
  ReviewAdjustmentDto,
  TransitionBonusRecordDto,
} from './wallet.dto.js';
import { IsOptional, IsString } from 'class-validator';

class AdjustmentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}

@ApiTags('admin/wallets')
@Controller('admin/wallets')
export class AdminWalletController {
  constructor(
    private readonly adjustments: AdjustmentsService,
    private readonly ledger: WalletLedgerService,
  ) {}

  /** Ledger viewer: any member's wallet transaction history, for finance/support review. */
  @Get(':userId/:type/transactions')
  @RequirePermissions('wallet.read.any')
  async memberTransactions(
    @Param('userId') userId: string,
    @Param('type') type: string,
    @Query() query: WalletTransactionQueryDto,
  ): Promise<PaginatedResult<WalletTransactionDto>> {
    if (!WALLET_TYPES.includes(type as WalletType)) throw new ApiException('WALLET_NOT_FOUND', `Unknown wallet type: ${type}`);
    const { skip, take } = paginationArgs(query);
    const { items, total } = await this.ledger.listTransactions(userId, type as WalletType, {
      skip,
      take,
      filters: {
        type: query.type,
        status: query.status,
        direction: query.direction,
        referenceType: query.referenceType,
        createdAt: dateRangeFilter(query.from, query.to),
      },
    });
    return { items, pagination: buildPaginationMeta(query, total) };
  }

  @Get('adjustments')
  @RequirePermissions('wallet.read.any')
  async listAdjustments(@Query() query: AdjustmentQueryDto): Promise<PaginatedResult<WalletAdjustmentRequestDto>> {
    const { skip, take } = paginationArgs(query);
    const { items, total } = await this.adjustments.list({ skip, take, status: query.status });
    return { items, pagination: buildPaginationMeta(query, total) };
  }

  @Post('adjustments')
  @RequirePermissions('wallet.adjust')
  async requestAdjustment(@CurrentUser() actor: RequestUser, @Body() dto: CreateAdjustmentDto): Promise<WalletAdjustmentRequestDto> {
    return this.adjustments.request(actor.id, dto);
  }

  @Patch('adjustments/:id/review')
  @RequirePermissions('wallet.adjust.approve')
  async reviewAdjustment(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewAdjustmentDto,
  ): Promise<WalletAdjustmentRequestDto> {
    return this.adjustments.review(actor.id, id, dto.decision, dto.note);
  }
}

@ApiTags('admin/bonus-rules')
@Controller('admin/bonus-rules')
export class AdminBonusRulesController {
  constructor(private readonly bonus: BonusService) {}

  @Get()
  @RequirePermissions('bonus.manage')
  async list(): Promise<BonusRuleDto[]> {
    return this.bonus.listRules();
  }

  @Post()
  @RequirePermissions('bonus.manage')
  async create(@CurrentUser() actor: RequestUser, @Body() dto: BonusRuleInputDto): Promise<BonusRuleDto> {
    return this.bonus.createRule(actor.id, dto);
  }

  @Patch(':id')
  @RequirePermissions('bonus.manage')
  async update(@CurrentUser() actor: RequestUser, @Param('id') id: string, @Body() dto: Partial<BonusRuleInputDto>): Promise<BonusRuleDto> {
    return this.bonus.updateRule(actor.id, id, dto);
  }
}

@ApiTags('admin/bonus-records')
@Controller('admin/bonus-records')
export class AdminBonusRecordsController {
  constructor(private readonly bonus: BonusService) {}

  @Get()
  @RequirePermissions('bonus.read.any')
  async list(@Query() query: PaginationQueryDto & { status?: string; ruleCode?: string; memberId?: string }): Promise<PaginatedResult<BonusRecordDto>> {
    const { skip, take } = paginationArgs(query);
    const { items, total } = await this.bonus.listRecords({ skip, take, status: query.status as never, ruleCode: query.ruleCode, memberId: query.memberId });
    return { items, pagination: buildPaginationMeta(query, total) };
  }

  @Post()
  @RequirePermissions('bonus.manage')
  async create(@CurrentUser() actor: RequestUser, @Body() dto: CreateBonusRecordDto): Promise<BonusRecordDto> {
    return this.bonus.createRecord(actor.id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('bonus.manage')
  async transition(@CurrentUser() actor: RequestUser, @Param('id') id: string, @Body() dto: TransitionBonusRecordDto): Promise<BonusRecordDto> {
    return this.bonus.transitionRecord(actor.id, id, dto.status);
  }
}
