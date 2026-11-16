import { liquidityOf, type Account } from '@/domain/accounts';
import type { IsoDate } from '@/domain/date';
import { convertExact, usdPriceOn, type Rate } from '@/domain/fx';
import {
  addMoney,
  Dec,
  isZero,
  roundToMoney,
  subtractMoney,
  zeroMoney,
  type Asset,
  type Money,
} from '@/domain/money';
import { balanceEffects, type Transaction } from '@/domain/transactions';

/** An account together with its current balance. */
export interface Position {
  readonly account: Account;
  readonly balance: Money;
}

/** In which currency and at which day's rates totals are expressed. */
export interface Valuation {
  readonly base: Asset;
  readonly rates: readonly Rate[];
  readonly date: IsoDate;
}

/**
 * Balance of every given account: opening balance plus the effects of its transactions.
 * Effects on accounts that were not given (deleted ones) are ignored.
 */
export function positions(
  accounts: Iterable<Account>,
  transactions: Iterable<Transaction>,
): Position[] {
  // A Map keeps the order of the accounts; updating a key does not move it.
  const state = new Map<string, Position>();
  for (const account of accounts) {
    state.set(account.id, { account, balance: account.openingBalance });
  }
  for (const transaction of transactions) {
    for (const { accountId, delta } of balanceEffects(transaction)) {
      const position = state.get(accountId);
      if (position) {
        state.set(accountId, { ...position, balance: addMoney(position.balance, delta) });
      }
    }
  }
  return [...state.values()];
}

export function accountBalance(account: Account, transactions: Iterable<Transaction>): Money {
  let balance = account.openingBalance;
  for (const transaction of transactions) {
    for (const { accountId, delta } of balanceEffects(transaction)) {
      if (accountId === account.id) balance = addMoney(balance, delta);
    }
  }
  return balance;
}

/** Sum in the base currency, converted exactly and rounded once. Empty balances need no rate. */
function total(amounts: Iterable<Money>, { base, rates, date }: Valuation): Money {
  let sum = new Dec(0);
  for (const amount of amounts) {
    if (isZero(amount)) continue;
    sum = sum.plus(
      convertExact(amount, base, {
        from: usdPriceOn(rates, amount.asset.code, date),
        to: usdPriceOn(rates, base.code, date),
      }),
    );
  }
  return roundToMoney(sum, base);
}

const isOwn = ({ account }: Position) => account.system === undefined;

/**
 * Capital (CONTEXT.md, "Капитал"): every account balance in the base currency, `locked` and
 * `volatile` included; a negative credit-card balance already reduces it. The system account
 * `importedHistory` is excluded (ADR-016).
 */
export function netWorth(state: Iterable<Position>, valuation: Valuation): Money {
  return total(
    [...state].filter(isOwn).map((position) => position.balance),
    valuation,
  );
}

/**
 * "Доступно сейчас": accounts with liquidity `available`, minus credit-card debt, minus what is
 * reserved for goals (reservations arrive in M5). An unused credit limit is not available money.
 */
export function availableNow(
  state: Iterable<Position>,
  valuation: Valuation,
  reserved: Money = zeroMoney(valuation.base),
): Money {
  const own = [...state].filter(isOwn);
  const available = own
    .filter(({ account }) => liquidityOf(account) === 'available')
    .map((position) => position.balance);
  const debts = own
    .filter(({ account, balance }) => account.kind === 'credit' && balance.amount < 0)
    .map((position) => position.balance);
  return subtractMoney(total([...available, ...debts], valuation), reserved);
}
