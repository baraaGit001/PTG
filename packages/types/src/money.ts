/**
 * Money is always represented as an integer number of minor units plus an
 * ISO-4217 currency code. Floating point is never used for monetary values
 * anywhere in the system.
 *
 * Example: { amountMinor: 1099, currency: 'USD' } === $10.99
 */
export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'ZAR', 'JPY', 'CNY', 'AED', 'GBP'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** Number of decimal places each currency uses. JPY has none. */
export const CURRENCY_EXPONENT: Record<CurrencyCode, number> = {
  USD: 2,
  EUR: 2,
  ZAR: 2,
  JPY: 0,
  CNY: 2,
  AED: 2,
  GBP: 2,
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function money(amountMinor: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new TypeError(`Money.amountMinor must be an integer, received ${amountMinor}`);
  }
  return { amountMinor, currency };
}

export const zeroMoney = (currency: CurrencyCode): Money => money(0, currency);

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function sumMoney(values: readonly Money[], currency: CurrencyCode): Money {
  return values.reduce<Money>((acc, value) => addMoney(acc, value), zeroMoney(currency));
}

/** Multiplies by an integer quantity. Safe because quantity is always a whole number. */
export function multiplyMoney(value: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) {
    throw new TypeError(`Quantity must be an integer, received ${quantity}`);
  }
  return money(value.amountMinor * quantity, value.currency);
}

/**
 * Applies a percentage expressed in basis points (1% === 100 bps) using
 * integer arithmetic with half-up rounding, so results never drift.
 */
export function applyBasisPoints(value: Money, basisPoints: number): Money {
  if (!Number.isInteger(basisPoints)) {
    throw new TypeError(`Basis points must be an integer, received ${basisPoints}`);
  }
  const product = value.amountMinor * basisPoints;
  const sign = product < 0 ? -1 : 1;
  const rounded = Math.floor((Math.abs(product) + 5000) / 10000);
  return money(sign * rounded, value.currency);
}

export function isZeroMoney(value: Money): boolean {
  return value.amountMinor === 0;
}

export function isNegativeMoney(value: Money): boolean {
  return value.amountMinor < 0;
}

export function compareMoney(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amountMinor === b.amountMinor ? 0 : a.amountMinor < b.amountMinor ? -1 : 1;
}

/**
 * Locale-aware presentation. Only ever used at the presentation edge - never
 * for arithmetic, comparison or persistence.
 */
export function formatMoney(value: Money, locale = 'en'): string {
  const exponent = CURRENCY_EXPONENT[value.currency] ?? 2;
  const major = value.amountMinor / 10 ** exponent;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(major);
}

/** Parses a user-entered major-unit string ("10.99") into minor units (1099). */
export function parseMajorToMinor(input: string, currency: CurrencyCode): number {
  const exponent = CURRENCY_EXPONENT[currency] ?? 2;
  const normalized = input.trim().replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new TypeError(`Invalid monetary input: ${input}`);
  }
  const negative = normalized.startsWith('-');
  const [whole = '0', fraction = ''] = normalized.replace('-', '').split('.');
  const paddedFraction = (fraction + '0'.repeat(exponent)).slice(0, exponent);
  const minor = Number(whole) * 10 ** exponent + (exponent > 0 ? Number(paddedFraction) : 0);
  return negative ? -minor : minor;
}

export function minorToMajor(amountMinor: number, currency: CurrencyCode): number {
  return amountMinor / 10 ** (CURRENCY_EXPONENT[currency] ?? 2);
}
