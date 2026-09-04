import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { WalletDto, WalletSummaryDto, PointSummaryDto, BonusSummaryDto } from '@ptg/types';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import type { AppConfig } from '../../config/configuration.js';
import { paginationArgs, buildPaginationMeta, dateRangeFilter, type PaginatedResult } from '../../common/dto/pagination.dto.js';
import { WalletLedgerService } from './wallet-ledger.service.js';
import { PointsService } from './points.service.js';
import { BonusService } from './bonus.service.js';
import { WalletTransactionQueryDto, PointTransactionQueryDto, BonusRecordQueryDto } from './wallet.dto.js';
import type { WalletTransactionDto, PointTransactionDto, BonusRecordDto } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { WALLET_TYPES, type WalletType } from '@ptg/types';

@ApiTags('wallets')
@Controller('wallets')
export class WalletController {
  constructor(
    private readonly ledger: WalletLedgerService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Get()
  @RequirePermissions('wallet.read')
  async summary(@CurrentUser() user: RequestUser): Promise<WalletSummaryDto> {
    const currency = this.config.get('platform', { infer: true }).defaultCurrency;
    const wallets = await this.ledger.getWalletSummary(user.id, currency);
    const pointsWallet = await this.ledger.getWallet(user.id, 'PERSONAL_POINTS', 'PTS');
    return { wallets, personalPoints: pointsWallet.balance.amountMinor };
  }

  @Get(':type')
  @RequirePermissions('wallet.read')
  async one(@CurrentUser() user: RequestUser, @Param('type') type: string): Promise<WalletDto> {
    this.assertWalletType(type);
    const currency = type === 'PERSONAL_POINTS' ? 'PTS' : this.config.get('platform', { infer: true }).defaultCurrency;
    return this.ledger.getWallet(user.id, type as WalletType, currency);
  }

  @Get(':type/transactions')
  @RequirePermissions('wallet.read')
  async transactions(
    @CurrentUser() user: RequestUser,
    @Param('type') type: string,
    @Query() query: WalletTransactionQueryDto,
  ): Promise<PaginatedResult<WalletTransactionDto>> {
    this.assertWalletType(type);
    const { skip, take } = paginationArgs(query);
    const { items, total } = await this.ledger.listTransactions(user.id, type as WalletType, {
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

  private assertWalletType(type: string): asserts type is WalletType {
    if (!WALLET_TYPES.includes(type as WalletType)) {
      throw new ApiException('WALLET_NOT_FOUND', `Unknown wallet type: ${type}`);
    }
  }
}

@ApiTags('points')
@Controller('points')
export class PointsController {
  constructor(private readonly points: PointsService) {}

  @Get()
  @RequirePermissions('points.read')
  async summary(@CurrentUser() user: RequestUser): Promise<PointSummaryDto> {
    return this.points.getSummary(user.id);
  }

  @Get('transactions')
  @RequirePermissions('points.read')
  async transactions(@CurrentUser() user: RequestUser, @Query() query: PointTransactionQueryDto): Promise<PaginatedResult<PointTransactionDto>> {
    const { skip, take } = paginationArgs(query);
    const { items, total } = await this.points.listTransactions(user.id, { skip, take, type: query.type });
    return { items, pagination: buildPaginationMeta(query, total) };
  }
}

@ApiTags('bonuses')
@Controller('bonuses')
export class BonusesController {
  constructor(private readonly bonus: BonusService) {}

  @Get()
  @RequirePermissions('bonus.read')
  async list(@CurrentUser() user: RequestUser, @Query() query: BonusRecordQueryDto): Promise<PaginatedResult<BonusRecordDto>> {
    const { skip, take } = paginationArgs(query);
    const { items, total } = await this.bonus.listRecordsForMember(user.id, { skip, take, status: query.status });
    return { items, pagination: buildPaginationMeta(query, total) };
  }

  @Get('summary')
  @RequirePermissions('bonus.read')
  async summary(@CurrentUser() user: RequestUser): Promise<BonusSummaryDto> {
    return this.bonus.getSummaryForMember(user.id);
  }
}
