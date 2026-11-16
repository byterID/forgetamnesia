import { DomainError } from '@/domain/errors';
import { sameAsset, type Asset } from './asset';

/** An amount of one asset in integer minor units (ADR-005). Never a float. */
export interface Money {
  readonly amount: number;
  readonly asset: Asset;
}

export function money(amount: number, asset: Asset): Money {
  if (!Number.isSafeInteger(amount)) {
    throw new DomainError(
      'amount-invalid',
      `Amount must be a safe integer of minor units, got ${String(amount)}`,
    );
  }
  // `amount + 0` turns -0 into 0, so equal amounts are always structurally equal.
  return { amount: amount + 0, asset };
}

export function zeroMoney(asset: Asset): Money {
  return { amount: 0, asset };
}

function assertSameAsset(a: Asset, b: Asset): void {
  if (!sameAsset(a, b)) {
    throw new DomainError('asset-mismatch', `Cannot combine ${a.code} with ${b.code}`);
  }
}

/** Result of integer arithmetic on two safe integers: exact unless it left the safe range. */
function checked(amount: number, asset: Asset): Money {
  if (!Number.isSafeInteger(amount)) {
    throw new DomainError('amount-overflow', `Amount of ${asset.code} is out of the safe range`);
  }
  return { amount: amount + 0, asset };
}

export function addMoney(a: Money, b: Money): Money {
  assertSameAsset(a.asset, b.asset);
  return checked(a.amount + b.amount, a.asset);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameAsset(a.asset, b.asset);
  return checked(a.amount - b.amount, a.asset);
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
