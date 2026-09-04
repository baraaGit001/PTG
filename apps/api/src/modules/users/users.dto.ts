import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ROLES, SUPPORTED_LOCALES, type RoleName } from '@ptg/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}

export class AddressInputDto {
  @IsString()
  recipientName!: string;

  @IsString()
  phone!: string;

  @IsString()
  country!: string;

  @IsString()
  region!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  district?: string | null;

  @IsString()
  street!: string;

  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class AdminUserQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: RoleName;
}

export class CreateUserDto {
  @IsString()
  memberId!: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsString()
  @MinLength(10)
  password!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ROLES, { each: true })
  roles!: RoleName[];

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;

  @IsOptional()
  @IsString()
  sponsorMemberId?: string | null;

  @IsOptional()
  @IsString()
  placementParentMemberId?: string | null;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsIn(['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'])
  status?: string;

  @IsOptional()
  @IsArray()
  @IsIn(ROLES, { each: true })
  roles?: RoleName[];

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}
