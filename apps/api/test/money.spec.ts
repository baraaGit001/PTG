import { addMoney, applyBasisPoints, compareMoney, money, multiplyMoney, parseMajorToMinor, subtractMoney, sumMoney } from '@ptg/types';

describe('money (integer minor-unit arithmetic)', () => {
  it('adds and subtracts same-currency amounts without floating point drift', () => {
    const a = money(1099, 'USD');
    const b = money(501, 'USD');
    expect(addMoney(a, b)).toEqual({ amountMinor: 1600, currency: 'USD' });
    expect(subtractMoney(a, b)).toEqual({ amountMinor: 598, currency: 'USD' });
  });

  it('throws on cross-currency arithmetic instead of silently mixing currencies', () => {
    expect(() => addMoney(money(100, 'USD'), money(100, 'EUR'))).toThrow(/Currency mismatch/);
  });

  it('multiplies by an integer quantity exactly', () => {
    expect(multiplyMoney(money(333, 'USD'), 3)).toEqual({ amountMinor: 999, currency: 'USD' });
  });

  it('sums a list of line items', () => {
    const lines = [money(1000, 'USD'), money(250, 'USD'), money(75, 'USD')];
    expect(sumMoney(lines, 'USD')).toEqual({ amountMinor: 1325, currency: 'USD' });
  });

  it('applies basis points with half-up rounding', () => {
    // 10% of $10.00 = $1.00
    expect(applyBasisPoints(money(1000, 'USD'), 1000)).toEqual({ amountMinor: 100, currency: 'USD' });
    // 7.5% of $9.99 = 74.925 -> rounds to 75
    expect(applyBasisPoints(money(999, 'USD'), 750)).toEqual({ amountMinor: 75, currency: 'USD' });
  });

  it('compares amounts', () => {
    expect(compareMoney(money(100, 'USD'), money(200, 'USD'))).toBe(-1);
    expect(compareMoney(money(200, 'USD'), money(100, 'USD'))).toBe(1);
    expect(compareMoney(money(100, 'USD'), money(100, 'USD'))).toBe(0);
  });

  it('parses a major-unit string into minor units', () => {
    expect(parseMajorToMinor('10.99', 'USD')).toBe(1099);
    expect(parseMajorToMinor('10', 'USD')).toBe(1000);
    expect(parseMajorToMinor('1500', 'JPY')).toBe(1500);
    expect(() => parseMajorToMinor('abc', 'USD')).toThrow();
  });
});
