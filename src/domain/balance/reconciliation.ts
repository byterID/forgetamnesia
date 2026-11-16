import type { Account } from '@/domain/accounts';
import { isoDate } from '@/domain/date';
import { usdPrice } from '@/domain/fx';
import { isZero, money, subtractMoney, type DecimalInput, type Money } from '@/domain/money';
import type { Adjustment, Transaction } from '@/domain/transactions';
import { accountBalance } from './balance';

/**
 * Balance reconciliation (CONTEXT.md, "Сверка баланса"): the user states the real balance and
 * gets the adjustment that makes the recorded balance equal to it, or `undefined` when they
 * already match. A decrease is an expense "Неучтённое" in analytics, an increase is not income
 * (ADR-019).
 */
export function reconcile(
  account: Account,
  transactions: Iterable<Transaction>,
  realBalance: Money,
  details: { id: string; date: string; usdPrice: DecimalInput },
): Adjustment | undefined {
  const difference = subtractMoney(realBalance, accountBalance(account, transactions));
  if (isZero(difference)) return undefined;
  return {
    id: details.id,
    type: 'adjustment',
    date: isoDate(details.date),
    accountId: account.id,
    amount: money(Math.abs(difference.amount), account.asset),
    direction: difference.amount > 0 ? 'increase' : 'decrease',
    usdPrice: usdPrice(details.usdPrice).toFixed(),
  };
}
