import type { IsoDate } from '@/domain/date';
import {
  Dec,
  minorUnits,
  roundToMoney,
  sameAsset,
  type Asset,
  type DecimalInput,
  type Money,
} from '@/domain/money';
import { parseUsdPrice, usdPriceOn, type Rate } from './rate';

/** USD prices of the source and the target asset. */
export interface PricePair {
  from: DecimalInput;
  to: DecimalInput;
}

/**
 * The amount in minor units of `to`, **not rounded**: `amount x price(from) / price(to)`, rescaled
 * between the two assets' decimals. Use it to add several conversions up and round once.
 * The same asset converts to itself whatever the prices.
 */
export function convertExact(amount: Money, to: Asset, prices: PricePair): Dec {
  if (sameAsset(amount.asset, to)) return minorUnits(amount);
  const shift = to.decimals - amount.asset.decimals;
  // One division at the very end keeps every intermediate product exact.
  const numerator = minorUnits(amount)
    .times(parseUsdPrice(prices.from))
    .times(new Dec(10).pow(Math.max(shift, 0)));
  const denominator = parseUsdPrice(prices.to).times(new Dec(10).pow(Math.max(-shift, 0)));
  return numerator.div(denominator);
}

/** Converts through the USD pivot (ADR-006), rounding half-even to the target's minor unit. */
export function convert(amount: Money, to: Asset, prices: PricePair): Money {
  return roundToMoney(convertExact(amount, to, prices), to);
}

/** `convertExact` with the rates picked for `date`. The same asset needs no rate at all. */
export function convertExactOn(
  amount: Money,
  to: Asset,
  rates: Iterable<Rate>,
  date: IsoDate,
): Dec {
  if (sameAsset(amount.asset, to)) return minorUnits(amount);
  return convertExact(amount, to, {
    from: usdPriceOn(rates, amount.asset.code, date),
    to: usdPriceOn(rates, to.code, date),
  });
}

/** `convert` with the rates picked for `date`. */
export function convertOn(amount: Money, to: Asset, rates: Iterable<Rate>, date: IsoDate): Money {
  return roundToMoney(convertExactOn(amount, to, rates, date), to);
}
