import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { MEMBER_ID } from '@ptg/config';

export class LoginDto {
  @IsString()
  @Matches(MEMBER_ID.pattern, { message: 'Member ID format is invalid.' })
  memberId!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class LogoutDto {
  @IsOptional()
  @IsBoolean()
  allSessions?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  newPassword!: string;
}

export class ForgotPasswordDto {
  @IsString()
  memberId!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  newPassword!: string;
}
