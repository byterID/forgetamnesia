import { DomainError } from '@/domain/errors';

export type AssetType = 'fiat' | 'crypto';

/** A currency or a coin. `decimals` is the number of digits of its minor unit (ADR-005: at most 8). */
export interface Asset {
  readonly code: string;
  readonly type: AssetType;
  readonly decimals: number;
}

export const MAX_DECIMALS = 8;

function isValidDecimals(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_DECIMALS;
}

function asset(code: string, type: AssetType, decimals: unknown): Asset {
  if (!isValidDecimals(decimals)) {
    throw new DomainError(
      'asset-invalid',
      `Decimals of ${code} must be an integer 0..${String(MAX_DECIMALS)}`,
    );
  }
  return { code, type, decimals };
}

/** Fiat currency by ISO 4217 code; the minor-unit digits come from `Intl` (JPY 0, RUB 2, KWD 3). */
export function fiatAsset(code: string): Asset {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{3}$/.test(upper)) {
    throw new DomainError('asset-invalid', `Fiat code must be three letters: "${code}"`);
  }
  const { maximumFractionDigits } = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: upper,
  }).resolvedOptions();
  return asset(upper, 'fiat', maximumFractionDigits);
}

/** Coin; amounts are kept with at most 8 decimals even when the chain has more (ADR-005). */
export function cryptoAsset(code: string, decimals = MAX_DECIMALS): Asset {
  const upper = code.toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(upper)) {
    throw new DomainError('asset-invalid', `Malformed coin code: "${code}"`);
  }
  return asset(upper, 'crypto', decimals);
}

export function sameAsset(a: Asset, b: Asset): boolean {
  return a.code === b.code && a.type === b.type && a.decimals === b.decimals;
}
