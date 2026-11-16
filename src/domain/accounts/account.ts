import { isoDate, type IsoDate } from '@/domain/date';
import { DomainError } from '@/domain/errors';
import { assertMoney, sameAsset, zeroMoney, type Asset, type Money } from '@/domain/money';
import { omitUndefined } from '@/domain/object';

export const ACCOUNT_KINDS = [
  'cash',
  'bank',
  'card',
  'credit',
  'savings',
  'locked',
  'investment',
  'crypto',
] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export type Liquidity = 'available' | 'locked' | 'volatile';

/** A place holding money of exactly one asset (CONTEXT.md, "Счёт"). */
export interface Account {
  readonly id: string;
  readonly name: string;
  readonly kind: AccountKind;
  readonly asset: Asset;
  /** State of the account on `openingDate` (ADR-016); transactions add to it. */
  readonly openingBalance: Money;
  readonly openingDate: IsoDate;
  /** `bank` and `card` differ only by this field (ADR-024). */
  readonly bank?: string;
  readonly liquidityOverride?: Liquidity;
  /** `importedHistory` holds imported monthly aggregates; outside net worth and available (ADR-016). */
  readonly system?: 'importedHistory';

  // Fields of the advanced kinds. Data only until M7 — no behaviour reads them yet.
  /** `credit`: the card limit. */
  readonly creditLimit?: Money;
  /** `credit`: day of month of the payment. */
  readonly paymentDay?: number;
  /** `savings`: annual interest rate in percent, exact decimal string. */
  readonly annualRate?: string;
  /** `locked`: the day the money becomes available. */
  readonly unlockDate?: IsoDate;
  /** `investment`: manual current value. */
  readonly valuation?: Money;
}

export type AccountInput = Omit<Account, 'openingBalance'> & { openingBalance?: Money };

const KIND_LIQUIDITY: Record<AccountKind, Liquidity | undefined> = {
  cash: 'available',
  bank: 'available',
  card: 'available',
  savings: 'available',
  locked: 'locked',
  investment: 'volatile',
  crypto: 'volatile',
  // Outside liquidity: the debt is subtracted from "available now" on its own.
  credit: undefined,
};

function assertInAsset(value: Money | undefined, asset: Asset, field: string): void {
  if (!value) return;
  assertMoney(value);
  if (!sameAsset(value.asset, asset)) {
    throw new DomainError(
      'asset-mismatch',
      `Account ${field} must be in ${asset.code}, got ${value.asset.code}`,
    );
  }
}

export function createAccount(input: AccountInput): Account {
  const name = input.name.trim();
  if (input.id === '' || name === '') {
    throw new DomainError('account-invalid', 'Account needs an id and a name');
  }
  assertInAsset(input.openingBalance, input.asset, 'opening balance');
  assertInAsset(input.creditLimit, input.asset, 'credit limit');
  assertInAsset(input.valuation, input.asset, 'valuation');
  return omitUndefined({
    ...input,
    name,
    openingBalance: input.openingBalance ?? zeroMoney(input.asset),
    openingDate: isoDate(input.openingDate),
    unlockDate: input.unlockDate === undefined ? undefined : isoDate(input.unlockDate),
  });
}

/** Liquidity of the account: the override, else derived from its kind; `undefined` for `credit`. */
export function liquidityOf(account: Account): Liquidity | undefined {
  return account.liquidityOverride ?? KIND_LIQUIDITY[account.kind];
}
