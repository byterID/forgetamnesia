import fc from 'fast-check';
import { DomainError } from '@/domain/errors';
import { convert, convertExact, convertOn, rate } from '@/domain/fx';
import { cryptoAsset, Dec, fiatAsset, money, type Asset } from '@/domain/money';

const RUB = fiatAsset('RUB');
const USD = fiatAsset('USD');
const AMD = fiatAsset('AMD');
const JPY = fiatAsset('JPY');
const BTC = cryptoAsset('BTC');
/** Two made-up assets with equal prices, to hit exact halves. */
const MILLI = cryptoAsset('MILLI', 3);
const CENTI = cryptoAsset('CENTI', 2);

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
  return undefined;
}

describe('convert', () => {
  it('goes through the USD pivot: amount x price(from) / price(to)', () => {
    // 80 RUB per USD.
    expect(convert(money(10000, USD), RUB, { from: '1', to: '0.0125' })).toEqual(
      money(800000, RUB),
    );
    expect(convert(money(800000, RUB), USD, { from: '0.0125', to: '1' })).toEqual(
      money(10000, USD),
    );
    // 0.2 RUB per AMD: 10 000 AMD = 2 000 RUB.
    expect(convert(money(1000000, AMD), RUB, { from: '0.0025', to: '0.0125' })).toEqual(
      money(200000, RUB),
    );
  });

  it('rescales between assets with different decimals', () => {
    // 1 BTC at 65 000 USD = 5 200 000 RUB.
    expect(convert(money(100000000, BTC), RUB, { from: '65000', to: '0.0125' })).toEqual(
      money(520000000, RUB),
    );
    // 1 RUB = 0.0125 / 65000 BTC = 19.23 satoshi.
    expect(convert(money(100, RUB), BTC, { from: '0.0125', to: '65000' })).toEqual(money(19, BTC));
    // 100 USD at 0.0064 USD per JPY = 15 625 JPY.
    expect(convert(money(10000, USD), JPY, { from: '1', to: '0.0064' })).toEqual(money(15625, JPY));
  });

  it("rounds half-even to the target's minor unit", () => {
    const same = { from: '1', to: '1' };
    expect(convert(money(5, MILLI), CENTI, same)).toEqual(money(0, CENTI));
    expect(convert(money(15, MILLI), CENTI, same)).toEqual(money(2, CENTI));
    expect(convert(money(25, MILLI), CENTI, same)).toEqual(money(2, CENTI));
    expect(convert(money(-15, MILLI), CENTI, same)).toEqual(money(-2, CENTI));
    expect(convert(money(26, MILLI), CENTI, same)).toEqual(money(3, CENTI));
  });

  it('is the identity for the same asset, whatever the prices', () => {
    const amount = money(123456, RUB);
    expect(convert(amount, RUB, { from: '0.0125', to: '0.0125' })).toBe(amount);
    expect(convert(amount, RUB, { from: '3', to: '7' })).toBe(amount);
  });

  it('rejects prices that are not positive and results that do not fit', () => {
    expect(codeOf(() => convert(money(1, USD), RUB, { from: '1', to: '0' }))).toBe('rate-invalid');
    expect(codeOf(() => convert(money(1, USD), RUB, { from: '-1', to: '1' }))).toBe('rate-invalid');
    expect(
      codeOf(() => convert(money(Number.MAX_SAFE_INTEGER, USD), RUB, { from: '1', to: '0.0125' })),
    ).toBe('amount-overflow');
  });

  it('exposes the unrounded result for sums that must round once', () => {
    const exact = convertExact(money(100, RUB), BTC, { from: '0.0125', to: '65000' });
    expect(exact.toFixed(6)).toBe('19.230769');
    expect(convertExact(money(5, MILLI), CENTI, { from: '1', to: '1' }).toString()).toBe('0.5');
    expect(convertExact(money(123, RUB), RUB, { from: '3', to: '7' }).toString()).toBe('123');
  });
});

describe('convertOn', () => {
  const rates = [
    rate({ asset: 'RUB', usdPrice: '0.0125', asOf: '2026-11-10', source: 'api' }),
    rate({ asset: 'RUB', usdPrice: '0.01', asOf: '2026-11-15', source: 'manual' }),
    rate({ asset: 'AMD', usdPrice: '0.0025', asOf: '2026-11-01', source: 'api' }),
  ];

  it('converts with the rates picked for the date', () => {
    expect(convertOn(money(10000, USD), RUB, rates, '2026-11-12')).toEqual(money(800000, RUB));
    expect(convertOn(money(10000, USD), RUB, rates, '2026-11-16')).toEqual(money(1000000, RUB));
    expect(convertOn(money(1000000, AMD), RUB, rates, '2026-11-16')).toEqual(money(250000, RUB));
  });

  it('needs no rate at all for the same asset', () => {
    expect(convertOn(money(500, JPY), JPY, [], '2026-11-16')).toEqual(money(500, JPY));
  });

  it('fails with the missing asset named', () => {
    expect(codeOf(() => convertOn(money(1, JPY), RUB, rates, '2026-11-16'))).toBe('rate-missing');
    expect(codeOf(() => convertOn(money(1, USD), RUB, rates, '2026-11-09'))).toBe('rate-missing');
  });
});

describe('convert (properties)', () => {
  const asset = fc
    .tuple(fc.constantFrom('AAA', 'BBB'), fc.integer({ min: 0, max: 8 }))
    .map(([code, decimals]): Asset => cryptoAsset(code, decimals));
  /** Prices from 1e-9 to ~1e12 as exact decimal strings. */
  const price = fc
    .tuple(fc.integer({ min: 1, max: 999_999_999 }), fc.integer({ min: -9, max: 3 }))
    .map(([mantissa, exponent]) => new Dec(mantissa).times(new Dec(10).pow(exponent)).toFixed());
  const amount = fc.integer({ min: -1_000_000_000_000, max: 1_000_000_000_000 });

  /** USD value of one minor unit. */
  const unitValue = (a: Asset, usdPrice: string) =>
    new Dec(usdPrice).div(new Dec(10).pow(a.decimals));

  it('round trip A -> B -> A loses at most half a minor unit of B (plus rounding)', () => {
    fc.assert(
      fc.property(asset, asset, price, price, amount, (a, b, priceA, priceB, units) => {
        const original = money(units, a);
        let back;
        try {
          const there = convert(original, b, { from: priceA, to: priceB });
          back = convert(there, a, { from: priceB, to: priceA });
        } catch (error) {
          // Overflow of the safe range is a legitimate refusal, not a wrong answer.
          fc.pre(!(error instanceof DomainError && error.code === 'amount-overflow'));
          throw error;
        }
        const bound = unitValue(b, priceB).div(unitValue(a, priceA).times(2)).plus('0.5').floor();
        expect(Math.abs(back.amount - units)).toBeLessThanOrEqual(bound.toNumber());
      }),
      { numRuns: 500 },
    );
  });

  it('round trip is exact when the minor unit of B is worth less than the minor unit of A', () => {
    fc.assert(
      fc.property(asset, asset, price, price, amount, (a, b, priceA, priceB, units) => {
        fc.pre(unitValue(b, priceB).lessThan(unitValue(a, priceA)));
        const original = money(units, a);
        let back;
        try {
          const there = convert(original, b, { from: priceA, to: priceB });
          back = convert(there, a, { from: priceB, to: priceA });
        } catch (error) {
          fc.pre(!(error instanceof DomainError && error.code === 'amount-overflow'));
          throw error;
        }
        expect(back).toEqual(original);
      }),
      { numRuns: 500 },
    );
  });

  it('converting to the same asset and back is always the identity', () => {
    fc.assert(
      fc.property(asset, price, amount, (a, p, units) => {
        expect(convert(money(units, a), a, { from: p, to: p })).toEqual(money(units, a));
      }),
    );
  });
});
