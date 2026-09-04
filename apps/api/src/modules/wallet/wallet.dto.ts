import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { REFERENCE_TYPES, TRANSACTION_DIRECTIONS, TRANSACTION_STATUSES, TRANSACTION_TYPES, WALLET_TYPES, POINT_TRANSACTION_TYPES, BONUS_RECORD_STATUSES, BONUS_RULE_TYPES } from '@ptg/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class WalletTransactionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: (typeof TRANSACTION_TYPES)[number];

  @IsOptional()
  @IsIn(TRANSACTION_STATUSES)
  status?: (typeof TRANSACTION_STATUSES)[number];

  @IsOptional()
  @IsIn(TRANSACTION_DIRECTIONS)
  direction?: (typeof TRANSACTION_DIRECTIONS)[number];

  @IsOptional()
  @IsIn(REFERENCE_TYPES)
  referenceType?: (typeof REFERENCE_TYPES)[number];
}

export class PointTransactionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(POINT_TRANSACTION_TYPES)
  type?: (typeof POINT_TRANSACTION_TYPES)[number];
}

export class BonusRecordQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(BONUS_RECORD_STATUSES)
  status?: (typeof BONUS_RECORD_STATUSES)[number];

  @IsOptional()
  @IsString()
  ruleCode?: string;

  @IsOptional()
  @IsString()
  memberId?: string;
}

export class CreateAdjustmentDto {
  @IsString()
  userId!: string;

  @IsIn(WALLET_TYPES)
  walletType!: (typeof WALLET_TYPES)[number];

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amountMinor!: number;

  @IsString()
  currency!: string;

  @IsIn(['IN', 'OUT'])
  direction!: 'IN' | 'OUT';

  @IsString()
  reason!: string;

  @IsString()
  idempotencyKey!: string;
}

export class ReviewAdjustmentDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  note?: string;
}

export class BonusRuleInputDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsIn(BONUS_RULE_TYPES)
  type!: (typeof BONUS_RULE_TYPES)[number];

  @IsOptional()
  @IsString()
  description?: string;

  active!: boolean;

  configuration!: Record<string, unknown>;

  @IsString()
  effectiveFrom!: string;

  @IsOptional()
  @IsString()
  effectiveTo?: string | null;
}

export class CreateBonusRecordDto {
  @IsString()
  memberId!: string;

  @IsString()
  ruleId!: string;

  @Type(() => Number)
  @IsNumber()
  amountMinor!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  sourceLabel?: string;

  @IsOptional()
  calculationBasis?: Record<string, unknown>;
}

export class TransitionBonusRecordDto {
  @IsIn(BONUS_RECORD_STATUSES)
  status!: (typeof BONUS_RECORD_STATUSES)[number];
}
