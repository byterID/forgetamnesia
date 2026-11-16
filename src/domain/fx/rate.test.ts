import { DomainError } from '@/domain/errors';
import { pickRate, rate, usdPriceOn, type Rate } from '@/domain/fx';

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
  return undefined;
}

const rub = (asOf: string, usdPrice: string, source: Rate['source'] = 'api') =>
  rate({ asset: 'RUB', usdPrice, asOf, source });

describe('rate', () => {
  it('is the USD price of an asset on a day, kept as an exact decimal string', () => {
    expect(rate({ asset: 'rub', usdPrice: '0.012500', asOf: '2026-11-16', source: 'api' })).toEqual(
      {
        asset: 'RUB',
        usdPrice: '0.0125',
        asOf: '2026-11-16',
        source: 'api',
      },
    );
    expect(rub('2026-11-16', '0.00000001').usdPrice).toBe('0.00000001');
    expect(rub('2026-11-16', '1e-7').usdPrice).toBe('0.0000001');
  });

  it('rejects a price that is not a positive number and a day that does not exist', () => {
    expect(codeOf(() => rub('2026-11-16', '0'))).toBe('rate-invalid');
    expect(codeOf(() => rub('2026-11-16', '-1'))).toBe('rate-invalid');
    expect(codeOf(() => rub('2026-11-16', 'abc'))).toBe('amount-invalid');
    expect(codeOf(() => rub('2026-02-30', '0.0125'))).toBe('date-invalid');
  });
});

describe('pickRate', () => {
  const rates = [
    rub('2026-11-10', '0.0120'),
    rub('2026-11-14', '0.0124'),
    rub('2026-11-14', '0.0130', 'manual'),
    rub('2026-11-20', '0.0140'),
    rate({ asset: 'AMD', usdPrice: '0.0026', asOf: '2026-11-15', source: 'api' }),
  ];

  it('takes the rate of the day when there is one', () => {
    expect(pickRate(rates, 'RUB', '2026-11-10')?.usdPrice).toBe('0.012');
    expect(pickRate(rates, 'RUB', '2026-11-20')?.usdPrice).toBe('0.014');
  });

  it('falls back to the nearest past rate, never to a future one', () => {
    expect(pickRate(rates, 'RUB', '2026-11-13')?.usdPrice).toBe('0.012');
    expect(pickRate(rates, 'RUB', '2026-11-19')?.asOf).toBe('2026-11-14');
    expect(pickRate(rates, 'RUB', '2026-12-31')?.usdPrice).toBe('0.014');
    expect(pickRate(rates, 'RUB', '2026-11-09')).toBeUndefined();
  });

  it('on the same day a manual rate overrides the API one, whatever the order', () => {
    expect(pickRate(rates, 'RUB', '2026-11-14')?.usdPrice).toBe('0.013');
    expect(pickRate([...rates].reverse(), 'RUB', '2026-11-14')?.usdPrice).toBe('0.013');
    expect(pickRate(rates, 'RUB', '2026-11-16')?.source).toBe('manual');
  });

  it('a newer API rate wins over an older manual one', () => {
    expect(pickRate(rates, 'RUB', '2026-11-21')?.source).toBe('api');
  });

  it('only looks at rates of the requested asset', () => {
    expect(pickRate(rates, 'AMD', '2026-11-16')?.usdPrice).toBe('0.0026');
    expect(pickRate(rates, 'EUR', '2026-11-16')).toBeUndefined();
    expect(pickRate([], 'RUB', '2026-11-16')).toBeUndefined();
  });
});

describe('usdPriceOn', () => {
  const rates = [rub('2026-11-10', '0.0120')];

  it('gives the picked price', () => {
    expect(usdPriceOn(rates, 'RUB', '2026-11-16')).toBe('0.012');
  });

  it('USD always costs one dollar, with or without rates', () => {
    expect(usdPriceOn([], 'USD', '2026-11-16')).toBe('1');
    expect(
      usdPriceOn(
        [rate({ asset: 'USD', usdPrice: '2', asOf: '2026-11-01', source: 'manual' })],
        'USD',
        '2026-11-16',
      ),
    ).toBe('1');
  });

  it('names the asset when no past rate is known', () => {
    expect(codeOf(() => usdPriceOn(rates, 'RUB', '2026-11-09'))).toBe('rate-missing');
    expect(() => usdPriceOn(rates, 'AMD', '2026-11-16')).toThrow(/AMD/);
  });
});
