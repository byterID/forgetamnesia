import { DomainError } from '@/domain/errors';
import { cryptoAsset, fiatAsset, money, parseMoney } from '@/domain/money';

const RUB = fiatAsset('RUB');
const JPY = fiatAsset('JPY');
const BTC = cryptoAsset('BTC');

// Built from code points so the invisible characters are visible in the source.
const NBSP = String.fromCharCode(0xa0);
const NARROW_NBSP = String.fromCharCode(0x202f);
const THIN_SPACE = String.fromCharCode(0x2009);
const TYPOGRAPHIC_MINUS = String.fromCharCode(0x2212);

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
  return undefined;
}

describe('parseMoney', () => {
  it('reads what a user types into an amount field', () => {
    expect(parseMoney('5 000,50', RUB)).toEqual(money(500050, RUB));
    expect(parseMoney('5000.5', RUB)).toEqual(money(500050, RUB));
    expect(parseMoney('  42 ', RUB)).toEqual(money(4200, RUB));
    expect(parseMoney('0,07', RUB)).toEqual(money(7, RUB));
    expect(parseMoney(',5', RUB)).toEqual(money(50, RUB));
    expect(parseMoney('5,', RUB)).toEqual(money(500, RUB));
  });

  it('accepts non-breaking, narrow and thin spaces and apostrophes as group separators', () => {
    expect(parseMoney(`1${NBSP}234${NARROW_NBSP}567,89`, RUB)).toEqual(money(123456789, RUB));
    expect(parseMoney(`1${THIN_SPACE}000`, RUB)).toEqual(money(100000, RUB));
    expect(parseMoney("1'000'000", RUB)).toEqual(money(100000000, RUB));
  });

  it('with both separators present the last one is the decimal separator', () => {
    expect(parseMoney('1,234.56', RUB)).toEqual(money(123456, RUB));
    expect(parseMoney('1.234,56', RUB)).toEqual(money(123456, RUB));
    expect(parseMoney('1,234,567.8', RUB)).toEqual(money(123456780, RUB));
  });

  it('a separator repeated without a decimal part is a group separator', () => {
    expect(parseMoney('1,000,000', RUB)).toEqual(money(100000000, RUB));
    expect(parseMoney('1.000.000', RUB)).toEqual(money(100000000, RUB));
  });

  it('reads a sign: ASCII minus, typographic minus and plus', () => {
    expect(parseMoney('-12,30', RUB)).toEqual(money(-1230, RUB));
    expect(parseMoney(`${TYPOGRAPHIC_MINUS} 12,30`, RUB)).toEqual(money(-1230, RUB));
    expect(parseMoney('+12,30', RUB)).toEqual(money(1230, RUB));
    expect(Object.is(parseMoney('-0', RUB).amount, 0)).toBe(true);
  });

  it('respects the decimals of the asset', () => {
    expect(parseMoney('1500', JPY)).toEqual(money(1500, JPY));
    expect(parseMoney('0,00000001', BTC)).toEqual(money(1, BTC));
    expect(parseMoney('1.5', BTC)).toEqual(money(150000000, BTC));
  });

  it('rejects more fraction digits than the asset has instead of guessing', () => {
    expect(codeOf(() => parseMoney('1,005', RUB))).toBe('money-parse');
    expect(codeOf(() => parseMoney('1,000', RUB))).toBe('money-parse');
    expect(codeOf(() => parseMoney('1,5', JPY))).toBe('money-parse');
    expect(codeOf(() => parseMoney('0.000000001', BTC))).toBe('money-parse');
  });

  it('rejects empty input and garbage', () => {
    for (const input of [
      '',
      '   ',
      'abc',
      '12a',
      '1e5',
      '--5',
      '5-',
      ',',
      '.',
      '1,2,3.4.5',
      '1.2,3.4',
    ]) {
      expect(
        codeOf(() => parseMoney(input, RUB)),
        input,
      ).toBe('money-parse');
    }
  });

  it('rejects amounts beyond the safe integer range', () => {
    expect(parseMoney('90071992547409,91', RUB)).toEqual(money(Number.MAX_SAFE_INTEGER, RUB));
    expect(codeOf(() => parseMoney('90071992547409,92', RUB))).toBe('amount-overflow');
    expect(codeOf(() => parseMoney('999999999999999999999', RUB))).toBe('amount-overflow');
  });
});
