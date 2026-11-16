import type { Account } from '@/domain/accounts';
import type { Category, CategoryKind } from '@/domain/categories';
import { isoDate, type IsoDate } from '@/domain/date';
import { DomainError } from '@/domain/errors';
import { convertExact, usdPriceFor } from '@/domain/fx';
import {
  assertMoney,
  compareMoney,
  isPositive,
  negateMoney,
  roundToMoney,
  sameAsset,
  subtractMoney,
  zeroMoney,
  type Asset,
  type DecimalInput,
  type Money,
} from '@/domain/money';
import { omitUndefined } from '@/domain/object';

interface TransactionCore {
  readonly id: string;
  /** Local calendar day of the transaction (ADR-024). */
  readonly date: IsoDate;
  readonly note?: string;
  readonly tags?: readonly string[];
}

/** Money movement on one account. `usdPrice` is the USD price of its asset when it happened (ADR-006). */
interface SingleAccount extends TransactionCore {
  readonly accountId: string;
  /** Always positive; the type (and, for an adjustment, the direction) gives the sign. */
  readonly amount: Money;
  readonly usdPrice: string;
}

export interface Expense extends SingleAccount {
  readonly type: 'expense';
  readonly categoryId: string;
  /** One-off big purchase: left out of `burnRate` only (ADR-022). */
  readonly isOneOff?: boolean;
  /** What was paid in the currency of the shop (RUB card in an AMD shop). Information only. */
  readonly purchaseAmount?: Money;
}

export interface Income extends SingleAccount {
  readonly type: 'income';
  readonly categoryId: string;
}

/**
 * Between own accounts; neither income nor expense. With different assets it is an **exchange**
 * and keeps both amounts and both USD prices.
 */
export interface Transfer extends TransactionCore {
  readonly type: 'transfer';
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly sent: Money;
  readonly received: Money;
  readonly sentUsdPrice: string;
  readonly receivedUsdPrice: string;
}

/** Made by reconciliation: a positive amount plus a direction (ADR-019). */
export interface Adjustment extends SingleAccount {
  readonly type: 'adjustment';
  readonly direction: 'increase' | 'decrease';
}

export type Transaction = Expense | Income | Transfer | Adjustment;
export type TransactionType = Transaction['type'];

/** What a transaction is checked against. */
export interface TransactionContext {
  account(id: string): Account | undefined;
  category(id: string): Category | undefined;
}

export function lookupContext(
  accounts: Iterable<Account>,
  categories: Iterable<Category>,
): TransactionContext {
  const accountsById = new Map([...accounts].map((account) => [account.id, account]));
  const categoriesById = new Map([...categories].map((category) => [category.id, category]));
  return {
    account: (id) => accountsById.get(id),
    category: (id) => categoriesById.get(id),
  };
}

function invalid(message: string): never {
  throw new DomainError('transaction-invalid', message);
}

/** The amount must be a positive whole number of minor units in the asset of an existing account. */
function assertFits(amount: Money, accountId: string, ctx: TransactionContext): void {
  assertMoney(amount);
  const account = ctx.account(accountId);
  if (!account) invalid(`Account "${accountId}" does not exist`);
  if (!sameAsset(amount.asset, account.asset)) {
    throw new DomainError(
      'asset-mismatch',
      `Account "${account.name}" holds ${account.asset.code}, got ${amount.asset.code}`,
    );
  }
  if (!isPositive(amount)) invalid('Amount must be greater than zero');
}

function assertCategory(categoryId: string, kind: CategoryKind, ctx: TransactionContext): void {
  const category = ctx.category(categoryId);
  if (!category) invalid(`Category "${categoryId}" does not exist`);
  if (category.kind !== kind) invalid(`Category "${category.name}" is not an ${kind} category`);
}

/** Checks every invariant of a transaction and returns it normalised; throws `DomainError`. */
export function createTransaction<T extends Transaction>(input: T, ctx: TransactionContext): T {
  if (input.id === '') invalid('Transaction needs an id');
  const note = input.note?.trim();
  const tags = [...new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
  const core = {
    date: isoDate(input.date),
    note: note === '' ? undefined : note,
    tags: tags.length > 0 ? tags : undefined,
  };

  if (input.type === 'transfer') {
    if (input.fromAccountId === input.toAccountId) invalid('Transfer needs two different accounts');
    assertFits(input.sent, input.fromAccountId, ctx);
    assertFits(input.received, input.toAccountId, ctx);
    if (!isExchange(input) && compareMoney(input.received, input.sent) > 0) {
      invalid('A transfer cannot deliver more than was sent');
    }
    return omitUndefined({
      ...input,
      ...core,
      sentUsdPrice: usdPriceFor(input.sent.asset.code, input.sentUsdPrice),
      receivedUsdPrice: usdPriceFor(input.received.asset.code, input.receivedUsdPrice),
    });
  }

  assertFits(input.amount, input.accountId, ctx);
  if (input.type !== 'adjustment') assertCategory(input.categoryId, input.type, ctx);
  if (input.type === 'expense' && input.purchaseAmount) {
    assertMoney(input.purchaseAmount);
    if (!isPositive(input.purchaseAmount)) invalid('Purchase amount must be greater than zero');
  }
  return omitUndefined({
    ...input,
    ...core,
    usdPrice: usdPriceFor(input.amount.asset.code, input.usdPrice),
  });
}

export function isExchange(transfer: Transfer): boolean {
  return !sameAsset(transfer.sent.asset, transfer.received.asset);
}

/**
 * Same-asset transfer: what was sent but did not arrive — an expense "Комиссии" in analytics
 * (ADR-024). `undefined` for an exchange, where the difference is `fxResult`.
 */
export function transferFee(transfer: Transfer): Money | undefined {
  return isExchange(transfer) ? undefined : subtractMoney(transfer.sent, transfer.received);
}

/**
 * Exchange result (CONTEXT.md, "Курсовая разница"): market value received minus market value
 * sent, at the USD prices stored on the transaction, in the base currency. Positive when the
 * exchange beat the market. Zero for a same-asset transfer.
 */
export function fxResult(
  transfer: Transfer,
  baseCurrency: Asset,
  baseCurrencyUsdPrice: DecimalInput,
): Money {
  if (!isExchange(transfer)) return zeroMoney(baseCurrency);
  const received = convertExact(transfer.received, baseCurrency, {
    from: transfer.receivedUsdPrice,
    to: baseCurrencyUsdPrice,
  });
  const sent = convertExact(transfer.sent, baseCurrency, {
    from: transfer.sentUsdPrice,
    to: baseCurrencyUsdPrice,
  });
  return roundToMoney(received.minus(sent), baseCurrency);
}

export interface BalanceEffect {
  readonly accountId: string;
  readonly delta: Money;
}

/** How a transaction changes account balances; the single source of truth for balance maths. */
export function balanceEffects(transaction: Transaction): BalanceEffect[] {
  switch (transaction.type) {
    case 'expense':
      return [{ accountId: transaction.accountId, delta: negateMoney(transaction.amount) }];
    case 'income':
      return [{ accountId: transaction.accountId, delta: transaction.amount }];
    case 'transfer':
      return [
        { accountId: transaction.fromAccountId, delta: negateMoney(transaction.sent) },
        { accountId: transaction.toAccountId, delta: transaction.received },
      ];
    case 'adjustment':
      return [
        {
          accountId: transaction.accountId,
          delta:
            transaction.direction === 'increase'
              ? transaction.amount
              : negateMoney(transaction.amount),
        },
      ];
  }
}
