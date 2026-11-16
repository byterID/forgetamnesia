import { DomainError, type DomainErrorCode } from '@/domain/errors';
import { sameAsset, type Asset } from './asset';

/** An amount of one asset in integer minor units (ADR-005). Never a float. */
export interface Money {
  readonly amount: number;
  readonly asset: Asset;
}

/** The one gate every amount passes: a safe integer, with -0 normalised to 0. */
function safeUnits(amount: number, asset: Asset, code: DomainErrorCode): Money {
  if (!Number.isSafeInteger(amount)) {
    throw new DomainError(
      code,
      `Amount of ${asset.code} must be a safe integer of minor units, got ${String(amount)}`,
    );
  }
  // `amount + 0` turns -0 into 0, so equal amounts are always structurally equal.
  return { amount: amount + 0, asset };
}

export function money(amount: number, asset: Asset): Money {
  return safeUnits(amount, asset, 'amount-invalid');
}

/**
 * Re-checks a `Money` that did not come from this module (a literal, a stored record) before it
 * is trusted: `Money` is a plain shape, so only this keeps a float out of the books.
 */
export function assertMoney(value: Money): void {
  safeUnits(value.amount, value.asset, 'amount-invalid');
}

export function zeroMoney(asset: Asset): Money {
  return { amount: 0, asset };
}

function assertSameAsset(a: Asset, b: Asset): void {
  if (!sameAsset(a, b)) {
    throw new DomainError('asset-mismatch', `Cannot combine ${a.code} with ${b.code}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameAsset(a.asset, b.asset);
  // Integer arithmetic on safe integers is exact unless the result leaves the safe range.
  return safeUnits(a.amount + b.amount, a.asset, 'amount-overflow');
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameAsset(a.asset, b.asset);
  return safeUnits(a.amount - b.amount, a.asset, 'amount-overflow');
}

export function negateMoney(a: Money): Money {
  return { amount: -a.amount + 0, asset: a.asset };
}

export function sumMoney(asset: Asset, items: Iterable<Money>): Money {
  let total = zeroMoney(asset);
  for (const item of items) total = addMoney(total, item);
  return total;
}

export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameAsset(a.asset, b.asset);
  return a.amount < b.amount ? -1 : a.amount > b.amount ? 1 : 0;
}

export function isZero(a: Money): boolean {
  return a.amount === 0;
}

export function isPositive(a: Money): boolean {
  return a.amount > 0;
}

export function isNegative(a: Money): boolean {
  return a.amount < 0;
}
