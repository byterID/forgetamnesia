import { DomainError } from '@/domain/errors';
import {
  cryptoAsset,
  Dec,
  fiatAsset,
  formatMoney,
  money,
  moneyFromDecimal,
  moneyToDecimalString,
  parseMoney,
} from '@/domain/money';

const RUB = fiatAsset('RUB');
const USD = fiatAsset('USD');
const JPY = fiatAsset('JPY');
const BTC = cryptoAsset('BTC');
const USDT = cryptoAsset('USDT', 6);

/** Intl uses non-breaking and narrow spaces; the tests only care about the visible text. */
const plain = (text: string) => text.replace(/\s/g, ' ');

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
  return undefined;
}

describe('moneyToDecimalString', () => {
  it('writes the exact amount in major units', () => {
    expect(moneyToDecimalString(money(500050, RUB))).toBe('5000.50');
    expect(moneyToDecimalString(money(7, RUB))).toBe('0.07');
    expect(moneyToDecimalString(money(-7, RUB))).toBe('-0.07');
    expect(moneyToDecimalString(money(1500, JPY))).toBe('1500');
    expect(moneyToDecimalString(money(1, BTC))).toBe('0.00000001');
    expect(moneyToDecimalString(money(Number.MAX_SAFE_INTEGER, BTC))).toBe('90071992.54740991');
  });

  it('round-trips through parseMoney', () => {
    for (const m of [money(-123456789, RUB), money(0, JPY), money(2100000000000001, BTC)]) {
      expect(parseMoney(moneyToDecimalString(m), m.asset)).toEqual(m);
    }
  });
});

describe('formatMoney', () => {
  it('formats fiat as a currency in the Russian locale by default', () => {
    expect(plain(formatMoney(money(500050, RUB)))).toBe('5 000,50 ₽');
    expect(plain(formatMoney(money(-7, RUB)))).toBe('-0,07 ₽');
    expect(plain(formatMoney(money(123456, USD)))).toBe('1 234,56 $');
    expect(plain(formatMoney(money(1500, JPY)))).toBe('1 500 ¥');
  });

  it('keeps every digit of large amounts (no float on the way)', () => {
    expect(plain(formatMoney(money(Number.MAX_SAFE_INTEGER, RUB)))).toBe('90 071 992 547 409,91 ₽');
    expect(plain(formatMoney(money(Number.MAX_SAFE_INTEGER, BTC)))).toBe('90 071 992,54740991 BTC');
  });

  it('formats coins as a number with the code, without trailing zeros', () => {
    expect(plain(formatMoney(money(150000000, BTC)))).toBe('1,5 BTC');
    expect(plain(formatMoney(money(1, BTC)))).toBe('0,00000001 BTC');
    expect(plain(formatMoney(money(2500000000, USDT)))).toBe('2 500 USDT');
  });

  it('takes a locale and a sign display', () => {
    expect(formatMoney(money(500050, USD), { locale: 'en-US' })).toBe('$5,000.50');
    expect(plain(formatMoney(money(500050, RUB), { signDisplay: 'always' }))).toBe('+5 000,50 ₽');
    expect(plain(formatMoney(money(100000000, BTC), { signDisplay: 'always' }))).toBe('+1 BTC');
  });
});

describe('moneyFromDecimal', () => {
  it('converts an exact decimal in major units', () => {
    expect(moneyFromDecimal('5000.5', RUB)).toEqual(money(500050, RUB));
    expect(moneyFromDecimal(new Dec('0.00000001'), BTC)).toEqual(money(1, BTC));
  });

  it("uses banker's rounding: halves go to the even neighbour", () => {
    expect(moneyFromDecimal('0.125', RUB)).toEqual(money(12, RUB));
    expect(moneyFromDecimal('0.135', RUB)).toEqual(money(14, RUB));
    expect(moneyFromDecimal('-0.125', RUB)).toEqual(money(-12, RUB));
    expect(moneyFromDecimal('-0.135', RUB)).toEqual(money(-14, RUB));
    expect(moneyFromDecimal('2.5', JPY)).toEqual(money(2, JPY));
    expect(moneyFromDecimal('3.5', JPY)).toEqual(money(4, JPY));
    expect(moneyFromDecimal('0.1250000001', RUB)).toEqual(money(13, RUB));
    expect(moneyFromDecimal('0.1249999999', RUB)).toEqual(money(12, RUB));
    expect(Object.is(moneyFromDecimal('-0.001', RUB).amount, 0)).toBe(true);
  });

  it('rejects values that are not finite numbers or do not fit', () => {
    expect(codeOf(() => moneyFromDecimal('abc', RUB))).toBe('amount-invalid');
    expect(codeOf(() => moneyFromDecimal('NaN', RUB))).toBe('amount-invalid');
    expect(codeOf(() => moneyFromDecimal('Infinity', RUB))).toBe('amount-invalid');
    expect(codeOf(() => moneyFromDecimal('90071992547409.92', RUB))).toBe('amount-overflow');
    expect(codeOf(() => moneyFromDecimal('-1e30', RUB))).toBe('amount-overflow');
  });
});
