import { liquidityOf, type Account } from '@/domain/accounts';
import type { IsoDate } from '@/domain/date';
import { convertExactOn, type Rate } from '@/domain/fx';
import {
  Dec,
  isNegative,
  isZero,
  roundToMoney,
  subtractMoney,
  sumMoney,
  zeroMoney,
  type Asset,
  type Money,
} from '@/domain/money';
import { balanceEffects, type BalanceEffect, type Transaction } from '@/domain/transactions';

/** An account together with its current balance. */
export interface Position {
  readonly account: Account;
  readonly balance: Money;
}

/** What totals are expressed in: the base currency and the rates of a day. */
export interface ReportingBasis {
  readonly baseCurrency: Asset;
  readonly rates: readonly Rate[];
  readonly date: IsoDate;
}

/** Opening balance plus every effect that lands on the account. */
function balanceAfter(account: Account, effects: readonly BalanceEffect[]): Money {
  const deltas = effects
    .filter((effect) => effect.accountId === account.id)
    .map((effect) => effect.delta);
  return sumMoney(account.asset, [account.openingBalance, ...deltas]);
}

export function accountBalance(account: Account, transactions: Iterable<Transaction>): Money {
  return balanceAfter(account, [...transactions].flatMap(balanceEffects));
}

/**
 * Balance of every given account, in the order given. Effects on accounts that were not given
 * (deleted ones) are ignored.
 */
export function positions(
  accounts: Iterable<Account>,
  transactions: Iterable<Transaction>,
): Position[] {
  const effects = [...transactions].flatMap(balanceEffects);
  return [...accounts].map((account) => ({ account, balance: balanceAfter(account, effects) }));
}

/** Sum in the base currency: converted exactly, rounded once (ADR-031). */
function total(amounts: readonly Money[], { baseCurrency, rates, date }: ReportingBasis): Money {
  const sum = amounts.reduce(
    // An empty balance needs no rate, however exotic its asset.
    (acc, amount) =>
      isZero(amount) ? acc : acc.plus(convertExactOn(amount, baseCurrency, rates, date)),
    new Dec(0),
  );
  return roundToMoney(sum, baseCurrency);
}

const isOwn = ({ account }: Position) => account.system === undefined;

/**
 * Capital (CONTEXT.md, "Капитал"): every account balance in the base currency, `locked` and
 * `volatile` included; a negative credit-card balance already reduces it. The system account
 * `importedHistory` is excluded (ADR-016).
 */
export function netWorth(state: Iterable<Position>, basis: ReportingBasis): Money {
  return total(
    [...state].filter(isOwn).map((position) => position.balance),
    basis,
  );
}

/**
 * "Доступно сейчас": accounts with liquidity `available`, minus credit-card debt, minus what is
 * reserved for goals (reservations arrive in M5). An unused credit limit is not available money.
 */
export function availableNow(
  state: Iterable<Position>,
  basis: ReportingBasis,
  reserved: Money = zeroMoney(basis.baseCurrency),
): Money {
  const counted = [...state]
    .filter(isOwn)
    .filter(
      ({ account, balance }) =>
        liquidityOf(account) === 'available' || (account.kind === 'credit' && isNegative(balance)),
    )
    .map((position) => position.balance);
  return subtractMoney(total(counted, basis), reserved);
}
