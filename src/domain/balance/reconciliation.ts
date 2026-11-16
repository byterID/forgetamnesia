import type { Account } from '@/domain/accounts';
import { isPositive, isZero, negateMoney, subtractMoney, type Money } from '@/domain/money';
import {
  createTransaction,
  lookupContext,
  type Adjustment,
  type Transaction,
} from '@/domain/transactions';
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
  details: { id: string; date: string; usdPrice: string },
): Adjustment | undefined {
  const difference = subtractMoney(realBalance, accountBalance(account, transactions));
  if (isZero(difference)) return undefined;
  const increase = isPositive(difference);
  // Built like any other transaction, so it obeys the same invariants.
  return createTransaction<Adjustment>(
    {
      id: details.id,
      type: 'adjustment',
      date: details.date,
      accountId: account.id,
      amount: increase ? difference : negateMoney(difference),
      direction: increase ? 'increase' : 'decrease',
      usdPrice: details.usdPrice,
    },
    lookupContext([account], []),
  );
}
