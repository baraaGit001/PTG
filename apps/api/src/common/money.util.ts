import type { CurrencyCode, Money } from '@ptg/types';

/**
 * Bridges Prisma's `BigInt` minor-unit columns and the shared `Money` DTO.
 * Every monetary read/write in the API funnels through these two functions -
 * no other file converts between BigInt and number for money.
 */
export function toMoney(amountMinor: bigint, currency: string): Money {
  return { amountMinor: Number(amountMinor), currency: currency as CurrencyCode };
}

export function toMinorBigInt(amountMinor: number): bigint {
  if (!Number.isInteger(amountMinor)) {
    throw new TypeError(`amountMinor must be an integer, received ${amountMinor}`);
  }
  return BigInt(amountMinor);
}
