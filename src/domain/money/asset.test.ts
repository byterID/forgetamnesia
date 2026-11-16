import { DomainError } from '@/domain/errors';
import { cryptoAsset, fiatAsset, sameAsset } from '@/domain/money';

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
  return undefined;
}

describe('Asset', () => {
  it('fiat asset takes its minor-unit digits from ISO 4217', () => {
    expect(fiatAsset('RUB')).toEqual({ code: 'RUB', type: 'fiat', decimals: 2 });
    expect(fiatAsset('usd')).toEqual({ code: 'USD', type: 'fiat', decimals: 2 });
    expect(fiatAsset('JPY').decimals).toBe(0);
    expect(fiatAsset('AMD').decimals).toBe(2);
  });

  it('crypto asset defaults to 8 decimals and never exceeds 8', () => {
    expect(cryptoAsset('BTC')).toEqual({ code: 'BTC', type: 'crypto', decimals: 8 });
    expect(cryptoAsset('usdt', 6)).toEqual({ code: 'USDT', type: 'crypto', decimals: 6 });
    expect(codeOf(() => cryptoAsset('ETH', 18))).toBe('asset-invalid');
    expect(codeOf(() => cryptoAsset('ETH', -1))).toBe('asset-invalid');
    expect(codeOf(() => cryptoAsset('ETH', 1.5))).toBe('asset-invalid');
  });

  it('rejects malformed codes', () => {
    expect(codeOf(() => fiatAsset('RU'))).toBe('asset-invalid');
    expect(codeOf(() => fiatAsset('RUBL'))).toBe('asset-invalid');
    expect(codeOf(() => cryptoAsset(''))).toBe('asset-invalid');
    expect(codeOf(() => cryptoAsset('B T C'))).toBe('asset-invalid');
  });

  it('assets are the same when code, type and decimals all match', () => {
    expect(sameAsset(fiatAsset('RUB'), fiatAsset('RUB'))).toBe(true);
    expect(sameAsset(fiatAsset('RUB'), fiatAsset('USD'))).toBe(false);
    expect(sameAsset(cryptoAsset('USDT', 6), cryptoAsset('USDT', 8))).toBe(false);
    expect(sameAsset(fiatAsset('USD'), { code: 'USD', type: 'crypto', decimals: 2 })).toBe(false);
  });
});
