import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MEMBERSHIP_STATUSES, TREE_KINDS, type MembershipStatus, type TreeKind } from '@ptg/types';
import { TREE } from '@ptg/config';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class MemberListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(MEMBERSHIP_STATUSES)
  status?: MembershipStatus;

  @IsOptional()
  @IsString()
  parentMemberId?: string;

  @IsOptional()
  @IsIn(TREE_KINDS)
  tree?: TreeKind;
}

export class TreeQueryDto {
  @IsOptional()
  @IsString()
  rootMemberId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TREE.maxDepth)
  depth?: number = TREE.defaultDepth;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(MEMBERSHIP_STATUSES)
  status?: MembershipStatus;
}

export class SetRelationshipDto {
  @IsString()
  memberId!: string;

  @IsOptional()
  @IsString()
  parentMemberId?: string | null;
}
