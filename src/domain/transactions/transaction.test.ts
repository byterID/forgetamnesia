import { createAccount } from '@/domain/accounts';
import type { Category } from '@/domain/categories';
import { fiatAsset, money, zeroMoney } from '@/domain/money';
import {
  balanceEffects,
  createTransaction,
  fxResult,
  isExchange,
  lookupContext,
  transferFee,
  type Transaction,
  type Transfer,
} from '@/domain/transactions';
import { codeOf } from '@tests/support/code-of';

const RUB = fiatAsset('RUB');
const USD = fiatAsset('USD');
const AMD = fiatAsset('AMD');

const card = createAccount({
  id: 'card',
  name: 'Карта',
  kind: 'card',
  asset: RUB,
  openingDate: '2026-01-01',
});
const cash = createAccount({
  id: 'cash',
  name: 'Наличные',
  kind: 'cash',
  asset: RUB,
  openingDate: '2026-01-01',
});
const dollars = createAccount({
  id: 'usd',
  name: 'Доллары',
  kind: 'bank',
  asset: USD,
  openingDate: '2026-01-01',
});

const groceries: Category = { id: 'groceries', name: 'Продукты', kind: 'expense', order: 0 };
const salary: Category = { id: 'salary', name: 'Зарплата', kind: 'income', order: 0 };

const ctx = lookupContext([card, cash, dollars], [groceries, salary]);

const expense: Transaction = {
  id: 't1',
  type: 'expense',
  date: '2026-11-16',
  accountId: 'card',
  amount: money(125050, RUB),
  usdPrice: '0.0125',
  categoryId: 'groceries',
};
const income: Transaction = {
  id: 't2',
  type: 'income',
  date: '2026-11-14',
  accountId: 'card',
  amount: money(10000000, RUB),
  usdPrice: '0.0125',
  categoryId: 'salary',
};
const transfer: Transfer = {
  id: 't3',
  type: 'transfer',
  date: '2026-11-16',
  fromAccountId: 'card',
  toAccountId: 'cash',
  sent: money(500000, RUB),
  received: money(500000, RUB),
  sentUsdPrice: '0.0125',
  receivedUsdPrice: '0.0125',
};
/** 8 100 RUB for 100 USD while the market says 80 RUB per USD. */
const exchange: Transfer = {
  id: 't4',
  type: 'transfer',
  date: '2026-11-16',
  fromAccountId: 'card',
  toAccountId: 'usd',
  sent: money(810000, RUB),
  received: money(10000, USD),
  sentUsdPrice: '0.0125',
  receivedUsdPrice: '1',
};
const adjustment: Transaction = {
  id: 't5',
  type: 'adjustment',
  date: '2026-11-16',
  accountId: 'cash',
  amount: money(30000, RUB),
  direction: 'decrease',
  usdPrice: '0.0125',
};

describe('createTransaction', () => {
  it('accepts an expense and normalises its optional fields', () => {
    const created = createTransaction(
      {
        ...expense,
        usdPrice: '0.012500',
        note: '  молоко ',
        tags: [' еда', 'еда', ''],
        isOneOff: true,
      },
      ctx,
    );
    expect(created).toEqual({ ...expense, note: 'молоко', tags: ['еда'], isOneOff: true });
  });

  it('drops an empty note and empty tags instead of storing them', () => {
    const created = createTransaction({ ...expense, note: '  ', tags: [] }, ctx);
    expect('note' in created).toBe(false);
    expect('tags' in created).toBe(false);
  });

  it('accepts an income, a transfer, an exchange and an adjustment as they are', () => {
    for (const tx of [income, transfer, exchange, adjustment]) {
      expect(createTransaction(tx, ctx)).toEqual(tx);
    }
  });

  it('requires a positive amount', () => {
    expect(codeOf(() => createTransaction({ ...expense, amount: zeroMoney(RUB) }, ctx))).toBe(
      'transaction-invalid',
    );
    expect(codeOf(() => createTransaction({ ...income, amount: money(-1, RUB) }, ctx))).toBe(
      'transaction-invalid',
    );
    expect(codeOf(() => createTransaction({ ...adjustment, amount: money(-1, RUB) }, ctx))).toBe(
      'transaction-invalid',
    );
    expect(codeOf(() => createTransaction({ ...transfer, sent: zeroMoney(RUB) }, ctx))).toBe(
      'transaction-invalid',
    );
    expect(codeOf(() => createTransaction({ ...exchange, received: zeroMoney(USD) }, ctx))).toBe(
      'transaction-invalid',
    );
  });

  it('requires a whole number of minor units, however the amount was built', () => {
    const float = { amount: 10.5, asset: RUB };
    expect(codeOf(() => createTransaction({ ...expense, amount: float }, ctx))).toBe(
      'amount-invalid',
    );
    expect(codeOf(() => createTransaction({ ...transfer, sent: float }, ctx))).toBe(
      'amount-invalid',
    );
  });

  it('requires the amount to be in the asset of its account', () => {
    expect(codeOf(() => createTransaction({ ...expense, amount: money(100, USD) }, ctx))).toBe(
      'asset-mismatch',
    );
    expect(codeOf(() => createTransaction({ ...exchange, sent: money(100, USD) }, ctx))).toBe(
      'asset-mismatch',
    );
    expect(codeOf(() => createTransaction({ ...exchange, received: money(100, RUB) }, ctx))).toBe(
      'asset-mismatch',
    );
  });

  it('requires known accounts, and two different ones for a transfer', () => {
    expect(codeOf(() => createTransaction({ ...expense, accountId: 'nope' }, ctx))).toBe(
      'transaction-invalid',
    );
    expect(codeOf(() => createTransaction({ ...transfer, toAccountId: 'nope' }, ctx))).toBe(
      'transaction-invalid',
    );
    expect(codeOf(() => createTransaction({ ...transfer, toAccountId: 'card' }, ctx))).toBe(
      'transaction-invalid',
    );
  });

  it('requires a known category of the matching kind', () => {
    expect(codeOf(() => createTransaction({ ...expense, categoryId: 'nope' }, ctx))).toBe(
      'transaction-invalid',
    );
    expect(codeOf(() => createTransaction({ ...expense, categoryId: 'salary' }, ctx))).toBe(
      'transaction-invalid',
    );
    expect(codeOf(() => createTransaction({ ...income, categoryId: 'groceries' }, ctx))).toBe(
      'transaction-invalid',
    );
  });

  it('requires an id, a real day and positive USD prices', () => {
    expect(codeOf(() => createTransaction({ ...expense, id: '' }, ctx))).toBe(
      'transaction-invalid',
    );
    expect(codeOf(() => createTransaction({ ...expense, date: '2026-11-31' }, ctx))).toBe(
      'date-invalid',
    );
    expect(codeOf(() => createTransaction({ ...expense, usdPrice: '0' }, ctx))).toBe(
      'rate-invalid',
    );
    expect(codeOf(() => createTransaction({ ...exchange, receivedUsdPrice: '-1' }, ctx))).toBe(
      'rate-invalid',
    );
  });

  it('a dollar always costs one dollar', () => {
    const inDollars: Transaction = {
      ...income,
      accountId: 'usd',
      amount: money(10000, USD),
      usdPrice: '1',
    };
    expect(createTransaction(inDollars, ctx)).toEqual(inDollars);
    expect(codeOf(() => createTransaction({ ...inDollars, usdPrice: '0.99' }, ctx))).toBe(
      'rate-invalid',
    );
    expect(codeOf(() => createTransaction({ ...exchange, receivedUsdPrice: '1.01' }, ctx))).toBe(
      'rate-invalid',
    );
  });

  it('an expense may carry the amount in the currency of the purchase, for information', () => {
    const abroad = { ...expense, purchaseAmount: money(5000000, AMD) };
    expect(createTransaction(abroad, ctx)).toEqual(abroad);
    expect(balanceEffects(abroad)).toEqual(balanceEffects(expense));
    expect(
      codeOf(() => createTransaction({ ...expense, purchaseAmount: money(-1, AMD) }, ctx)),
    ).toBe('transaction-invalid');
    expect(
      codeOf(() =>
        createTransaction({ ...expense, purchaseAmount: { amount: 0.5, asset: AMD } }, ctx),
      ),
    ).toBe('amount-invalid');
  });

  it('a same-asset transfer cannot deliver more than was sent', () => {
    expect(
      codeOf(() => createTransaction({ ...transfer, received: money(500001, RUB) }, ctx)),
    ).toBe('transaction-invalid');
  });
});

describe('transfer', () => {
  it('is an exchange when the two assets differ', () => {
    expect(isExchange(transfer)).toBe(false);
    expect(isExchange(exchange)).toBe(true);
  });

  it('same asset: the difference between sent and received is the fee', () => {
    expect(transferFee(transfer)).toEqual(zeroMoney(RUB));
    expect(transferFee({ ...transfer, received: money(495000, RUB) })).toEqual(money(5000, RUB));
    expect(transferFee(exchange)).toBeUndefined();
  });
});

describe('fxResult', () => {
  it('is the market value received minus the market value sent, in the base currency', () => {
    // Received 100 USD = 8 000 RUB at market, paid 8 100 RUB: lost 100 RUB.
    expect(fxResult(exchange, RUB, '0.0125')).toEqual(money(-10000, RUB));
    // The same loss of 1.25 USD seen from AMD at 0.0025 USD: 500 AMD.
    expect(fxResult(exchange, AMD, '0.0025')).toEqual(money(-50000, AMD));
    expect(fxResult(exchange, USD, '1')).toEqual(money(-125, USD));
  });

  it('is positive when the exchange beat the market and zero when it matched it', () => {
    expect(fxResult({ ...exchange, sent: money(790000, RUB) }, RUB, '0.0125')).toEqual(
      money(10000, RUB),
    );
    expect(fxResult({ ...exchange, sent: money(800000, RUB) }, RUB, '0.0125')).toEqual(
      zeroMoney(RUB),
    );
  });

  it('a same-asset transfer has no exchange result', () => {
    expect(fxResult({ ...transfer, received: money(495000, RUB) }, RUB, '0.0125')).toEqual(
      zeroMoney(RUB),
    );
  });
});

describe('balanceEffects', () => {
  it('an expense takes money from its account, an income adds it', () => {
    expect(balanceEffects(expense)).toEqual([{ accountId: 'card', delta: money(-125050, RUB) }]);
    expect(balanceEffects(income)).toEqual([{ accountId: 'card', delta: money(10000000, RUB) }]);
  });

  it('a transfer takes the sent amount from one account and adds the received one to the other', () => {
    expect(balanceEffects(exchange)).toEqual([
      { accountId: 'card', delta: money(-810000, RUB) },
      { accountId: 'usd', delta: money(10000, USD) },
    ]);
  });

  it('an adjustment moves the balance in its direction', () => {
    expect(balanceEffects(adjustment)).toEqual([{ accountId: 'cash', delta: money(-30000, RUB) }]);
    expect(balanceEffects({ ...adjustment, direction: 'increase' })).toEqual([
      { accountId: 'cash', delta: money(30000, RUB) },
    ]);
  });
});
