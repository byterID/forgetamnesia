import { isoDate, type IsoDate } from '@/domain/date';
import { DomainError } from '@/domain/errors';
import { decimal, type Dec, type DecimalInput } from '@/domain/money';

export type RateSource = 'api' | 'manual';

/** USD price of one whole unit of an asset on a day (ADR-006). Cross rates go through USD. */
export interface Rate {
  /** Asset code. */
  readonly asset: string;
  /** Exact decimal string, never a float. */
  readonly usdPrice: string;
  readonly asOf: IsoDate;
  readonly source: RateSource;
}

/** A USD price as an exact positive decimal; throws `rate-invalid` otherwise. */
export function usdPrice(value: DecimalInput): Dec {
  const price = decimal(value);
  if (!price.isPositive() || price.isZero()) {
    throw new DomainError('rate-invalid', `USD price must be positive, got "${String(value)}"`);
  }
  return price;
}

export function rate(input: {
  asset: string;
  usdPrice: DecimalInput;
  asOf: string;
  source: RateSource;
}): Rate {
  return {
    asset: input.asset.toUpperCase(),
    usdPrice: usdPrice(input.usdPrice).toFixed(),
    asOf: isoDate(input.asOf),
    source: input.source,
  };
}

function overrides(candidate: Rate, current: Rate): boolean {
  if (candidate.asOf !== current.asOf) return candidate.asOf > current.asOf;
  return candidate.source === 'manual' && current.source === 'api';
}

/**
 * The rate to use on `date`: the nearest one not later than the date; on the same day a manual
 * rate overrides the API one (finance.md F3). `undefined` when no past rate is known.
 */
export function pickRate(
  rates: Iterable<Rate>,
  assetCode: string,
  date: IsoDate,
): Rate | undefined {
  let best: Rate | undefined;
  for (const candidate of rates) {
    if (candidate.asset !== assetCode || candidate.asOf > date) continue;
    if (!best || overrides(candidate, best)) best = candidate;
  }
  return best;
}

/** USD price of an asset on a date; USD is always 1. Throws `rate-missing` naming the asset. */
export function usdPriceOn(rates: Iterable<Rate>, assetCode: string, date: IsoDate): string {
  if (assetCode === 'USD') return '1';
  const picked = pickRate(rates, assetCode, date);
  if (!picked) {
    throw new DomainError('rate-missing', `No rate for ${assetCode} on or before ${date}`);
  }
  return picked.usdPrice;
}
