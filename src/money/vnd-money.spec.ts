import {
  addVndAmounts,
  multiplyVndAmount,
  parseVndAmount,
  VND_MAX_AMOUNT,
  vndMoneyTransformer,
} from './vnd-money';

describe('integer VND money', () => {
  it('accepts whole VND numbers and PostgreSQL bigint strings', () => {
    expect(parseVndAmount(24_990_000)).toBe(24_990_000);
    expect(vndMoneyTransformer.from('24990000')).toBe(24_990_000);
    expect(vndMoneyTransformer.to(24_990_000)).toBe(24_990_000);
  });

  it.each([24_999.5, -1, Number.POSITIVE_INFINITY, '24999.50'])(
    'rejects invalid VND amount %p without rounding',
    (amount) => {
      expect(() => parseVndAmount(amount)).toThrow(RangeError);
    },
  );

  it('keeps multiplication and addition exact', () => {
    expect(multiplyVndAmount(150_000, 3)).toBe(450_000);
    expect(addVndAmounts(450_000, 99_000)).toBe(549_000);
  });

  it('rejects unsafe totals and fractional quantities', () => {
    expect(() => addVndAmounts(VND_MAX_AMOUNT, 1)).toThrow(RangeError);
    expect(() => multiplyVndAmount(100_000, 1.5)).toThrow(RangeError);
  });
});
