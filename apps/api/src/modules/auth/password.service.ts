import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PASSWORD_POLICY } from '@ptg/config';
import { ApiException } from '../../common/errors/api.exception.js';

/** Argon2id hashing and the server-enforced password policy. */
@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /** Throws PASSWORD_POLICY_VIOLATION with the first unmet rule; call before hashing on signup/reset/change. */
  assertPolicy(plain: string): void {
    const { minLength, maxLength, requireLowercase, requireUppercase, requireDigit } = PASSWORD_POLICY;
    if (plain.length < minLength || plain.length > maxLength) {
      throw new ApiException(
        'PASSWORD_POLICY_VIOLATION',
        `Password must be between ${minLength} and ${maxLength} characters.`,
      );
    }
    if (requireLowercase && !/[a-z]/.test(plain)) {
      throw new ApiException('PASSWORD_POLICY_VIOLATION', 'Password must include a lowercase letter.');
    }
    if (requireUppercase && !/[A-Z]/.test(plain)) {
      throw new ApiException('PASSWORD_POLICY_VIOLATION', 'Password must include an uppercase letter.');
    }
    if (requireDigit && !/\d/.test(plain)) {
      throw new ApiException('PASSWORD_POLICY_VIOLATION', 'Password must include a digit.');
    }
  }
}
