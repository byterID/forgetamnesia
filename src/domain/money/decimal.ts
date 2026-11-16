import Decimal from 'decimal.js';
import { DomainError } from '@/domain/errors';
import type { Asset } from './asset';
import type { Money } from './money';

/**
 * The project's decimal arithmetic (ADR-005, ADR-031): 40 significant digits, banker's rounding.
 * A private clone, so nobody's global `Decimal.set` can change how money is rounded.
 */
export const Dec = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });
export type Dec = Decimal;

/** Exact decimals only: a `number` would smuggle a float into money maths. */
export type DecimalInput = string | Decimal;

export function decimal(value: DecimalInput): Dec {
  let parsed: Dec;
  try {
    parsed = new Dec(value);
  } catch {
    throw new DomainError('amount-invalid', `Not a decimal number: "${String(value)}"`);
  }
  if (!parsed.isFinite()) {
    throw new DomainError('amount-invalid', `Not a finite number: "${String(value)}"`);
  }
  return parsed;
}

/** Rounds an exact count of minor units half-even; the only place where a decimal becomes Money. */
export function roundToMoney(minorUnits: Dec, asset: Asset): Money {
  const rounded = minorUnits.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN);
  if (rounded.abs().greaterThan(Number.MAX_SAFE_INTEGER)) {
    throw new DomainError('amount-overflow', `Amount of ${asset.code} is out of the safe range`);
  }
  return { amount: rounded.toNumber() + 0, asset };
}

/** Exact count of minor units as a decimal, for maths that must not round midway. */
export function minorUnits(value: Money): Dec {
  return new Dec(value.amount);
}

/** Money from an exact decimal in major units ("5000.5" RUB), rounded half-even to minor units. */
export function moneyFromDecimal(major: DecimalInput, asset: Asset): Money {
  return roundToMoney(decimal(major).times(new Dec(10).pow(asset.decimals)), asset);
}
