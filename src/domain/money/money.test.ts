import { DomainError } from '@/domain/errors';
import {
  addMoney,
  compareMoney,
  cryptoAsset,
  fiatAsset,
  isNegative,
  isPositive,
  isZero,
  money,
  negateMoney,
  subtractMoney,
  sumMoney,
  zeroMoney,
} from '@/domain/money';

const RUB = fiatAsset('RUB');
const USD = fiatAsset('USD');

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
  return undefined;
}

describe('Money', () => {
  it('is an integer number of minor units of one asset', () => {
    expect(money(500050, RUB)).toEqual({ amount: 500050, asset: RUB });
    expect(money(-1, RUB).amount).toBe(-1);
    expect(zeroMoney(USD)).toEqual({ amount: 0, asset: USD });
  });

  it('rejects fractional, non-finite and unsafe amounts', () => {
    expect(codeOf(() => money(0.5, RUB))).toBe('amount-invalid');
    expect(codeOf(() => money(Number.NaN, RUB))).toBe('amount-invalid');
    expect(codeOf(() => money(Number.POSITIVE_INFINITY, RUB))).toBe('amount-invalid');
    expect(codeOf(() => money(Number.MAX_SAFE_INTEGER + 1, RUB))).toBe('amount-invalid');
  });

  it('normalises negative zero', () => {
    expect(Object.is(money(-0, RUB).amount, 0)).toBe(true);
    expect(Object.is(negateMoney(zeroMoney(RUB)).amount, 0)).toBe(true);
  });

  it('adds and subtracts amounts of the same asset', () => {
    expect(addMoney(money(10050, RUB), money(250, RUB))).toEqual(money(10300, RUB));
    expect(subtractMoney(money(10050, RUB), money(20000, RUB))).toEqual(money(-9950, RUB));
    expect(negateMoney(money(700, USD))).toEqual(money(-700, USD));
  });

  it('refuses to mix assets', () => {
    expect(codeOf(() => addMoney(money(1, RUB), money(1, USD)))).toBe('asset-mismatch');
    expect(codeOf(() => subtractMoney(money(1, RUB), money(1, USD)))).toBe('asset-mismatch');
    expect(codeOf(() => compareMoney(money(1, RUB), money(1, USD)))).toBe('asset-mismatch');
    expect(codeOf(() => sumMoney(RUB, [money(1, RUB), money(1, USD)]))).toBe('asset-mismatch');
    expect(
      codeOf(() => addMoney(money(1, cryptoAsset('USDT', 6)), money(1, cryptoAsset('USDT', 8)))),
    ).toBe('asset-mismatch');
  });

  it('fails loudly instead of losing precision on overflow', () => {
    const max = money(Number.MAX_SAFE_INTEGER, RUB);
    expect(codeOf(() => addMoney(max, money(1, RUB)))).toBe('amount-overflow');
    expect(codeOf(() => subtractMoney(negateMoney(max), money(1, RUB)))).toBe('amount-overflow');
    expect(codeOf(() => sumMoney(RUB, [max, max]))).toBe('amount-overflow');
  });

  it('sums a list, an empty list being zero', () => {
    expect(sumMoney(RUB, [])).toEqual(zeroMoney(RUB));
    expect(sumMoney(RUB, [money(1, RUB), money(2, RUB), money(-10, RUB)])).toEqual(money(-7, RUB));
  });

  it('compares and classifies by sign', () => {
    expect(compareMoney(money(1, RUB), money(2, RUB))).toBe(-1);
    expect(compareMoney(money(2, RUB), money(2, RUB))).toBe(0);
    expect(compareMoney(money(3, RUB), money(2, RUB))).toBe(1);
    expect([isZero(zeroMoney(RUB)), isZero(money(1, RUB))]).toEqual([true, false]);
    expect([isPositive(money(1, RUB)), isPositive(zeroMoney(RUB))]).toEqual([true, false]);
    expect([isNegative(money(-1, RUB)), isNegative(zeroMoney(RUB))]).toEqual([true, false]);
  });
});
