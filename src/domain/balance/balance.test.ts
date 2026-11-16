import fc from 'fast-check';
import { createAccount, type Account } from '@/domain/accounts';
import { accountBalance, availableNow, netWorth, positions } from '@/domain/balance';
import { rate } from '@/domain/fx';
import { cryptoAsset, fiatAsset, money, zeroMoney, type Asset, type Money } from '@/domain/money';
import type { Transaction } from '@/domain/transactions';
import { codeOf } from '@tests/support/code-of';

const RUB = fiatAsset('RUB');
const USD = fiatAsset('USD');
const AMD = fiatAsset('AMD');
const BTC = cryptoAsset('BTC');

function account(id: string, kind: Account['kind'], opening: Money, extra: Partial<Account> = {}) {
  return createAccount({
    id,
    name: id,
    kind,
    asset: opening.asset,
    openingBalance: opening,
    openingDate: '2026-01-01',
    ...extra,
  });
}

const card = account('card', 'card', money(1000000, RUB)); // 10 000 RUB
const dollars = account('usd', 'bank', money(50000, USD)); // 500 USD

const expense = (id: string, accountId: string, amount: Money): Transaction => ({
  id,
  type: 'expense',
  date: '2026-11-16',
  accountId,
  amount,
  usdPrice: '0.0125',
  categoryId: 'c',
});

describe('accountBalance', () => {
  it('is the opening balance when nothing happened', () => {
    expect(accountBalance(card, [])).toEqual(money(1000000, RUB));
  });

  it('adds the effect of every transaction of the account and ignores the others', () => {
    const transactions: Transaction[] = [
      expense('t1', 'card', money(250000, RUB)),
      {
        id: 't2',
        type: 'income',
        date: '2026-11-14',
        accountId: 'card',
        amount: money(5000000, RUB),
        usdPrice: '0.0125',
        categoryId: 's',
      },
      {
        id: 't3',
        type: 'transfer',
        date: '2026-11-15',
        fromAccountId: 'card',
        toAccountId: 'usd',
        sent: money(810000, RUB),
        received: money(10000, USD),
        sentUsdPrice: '0.0125',
        receivedUsdPrice: '1',
      },
      {
        id: 't4',
        type: 'adjustment',
        date: '2026-11-16',
        accountId: 'card',
        amount: money(40000, RUB),
        direction: 'decrease',
        usdPrice: '0.0125',
      },
      expense('t5', 'usd', money(2500, USD)),
    ];
    // 10 000 - 2 500 + 50 000 - 8 100 - 400 = 49 000 RUB
    expect(accountBalance(card, transactions)).toEqual(money(4900000, RUB));
    // 500 + 100 - 25 = 575 USD
    expect(accountBalance(dollars, transactions)).toEqual(money(57500, USD));
  });

  it('may go negative: that is a debt', () => {
    expect(accountBalance(card, [expense('t1', 'card', money(1500000, RUB))])).toEqual(
      money(-500000, RUB),
    );
  });
});

describe('positions', () => {
  it('pairs every account with its balance, in the order of the accounts', () => {
    const result = positions([card, dollars], [expense('t1', 'usd', money(2500, USD))]);
    expect(result).toEqual([
      { account: card, balance: money(1000000, RUB) },
      { account: dollars, balance: money(47500, USD) },
    ]);
  });

  it('ignores transactions of accounts it was not given (e.g. deleted ones)', () => {
    expect(positions([card], [expense('t1', 'gone', money(2500, USD))])).toEqual([
      { account: card, balance: money(1000000, RUB) },
    ]);
  });

  it('does not depend on the order of transactions', () => {
    const accounts = [card, account('cash', 'cash', zeroMoney(RUB)), dollars];
    const assetOf: Record<string, Asset> = { card: RUB, cash: RUB, usd: USD };
    const id = fc.constantFrom('card', 'cash', 'usd');
    const units = fc.integer({ min: 1, max: 1_000_000_000 });
    const single = fc
      .tuple(fc.constantFrom('expense', 'income'), id, units)
      .map(([type, accountId, amount]): Transaction => ({
        id: 'x',
        type: type,
        date: '2026-11-16',
        accountId,
        amount: money(amount, assetOf[accountId] ?? RUB),
        usdPrice: '1',
        categoryId: 'c',
      }));
    const adjustment = fc
      .tuple(fc.constantFrom('increase', 'decrease'), id, units)
      .map(([direction, accountId, amount]): Transaction => ({
        id: 'x',
        type: 'adjustment',
        date: '2026-11-16',
        accountId,
        amount: money(amount, assetOf[accountId] ?? RUB),
        direction: direction,
        usdPrice: '1',
      }));
    const transfer = fc
      .tuple(id, id, units, units)
      .map(([from, to, sent, received]): Transaction => ({
        id: 'x',
        type: 'transfer',
        date: '2026-11-16',
        fromAccountId: from,
        toAccountId: to,
        sent: money(sent, assetOf[from] ?? RUB),
        received: money(received, assetOf[to] ?? RUB),
        sentUsdPrice: '1',
        receivedUsdPrice: '1',
      }));
    const history = fc.array(fc.oneof(single, adjustment, transfer), { maxLength: 40 });
    const shuffled = history.chain((list) =>
      fc.tuple(fc.constant(list), fc.shuffledSubarray(list, { minLength: list.length })),
    );
    fc.assert(
      fc.property(shuffled, ([original, reordered]) => {
        expect(positions(accounts, reordered)).toEqual(positions(accounts, original));
      }),
      { numRuns: 300 },
    );
  });
});

describe('netWorth and availableNow', () => {
  // 80 RUB per USD, 0.2 RUB per AMD, 5 200 000 RUB per BTC.
  const rates = [
    rate({ asset: 'RUB', usdPrice: '0.0125', asOf: '2026-11-01', source: 'api' }),
    rate({ asset: 'AMD', usdPrice: '0.0025', asOf: '2026-11-01', source: 'api' }),
    rate({ asset: 'BTC', usdPrice: '65000', asOf: '2026-11-01', source: 'api' }),
  ];
  const basis = { baseCurrency: RUB, rates, date: '2026-11-16' };

  const accounts = [
    card, //                                                   10 000 RUB  available
    dollars, //                                 500 USD  =     40 000 RUB  available
    account('dram', 'cash', money(10000000, AMD)), // 100 000 AMD = 20 000 RUB  available
    account('piggy', 'savings', money(3000000, RUB)), //       30 000 RUB  available
    account('iis', 'locked', money(40000000, RUB)), //        400 000 RUB  locked
    account('broker', 'investment', money(15000000, RUB)), // 150 000 RUB  volatile
    account('wallet', 'crypto', money(1000000, BTC)), // 0.01 BTC = 52 000 RUB volatile
    account('credit', 'credit', money(-2500000, RUB), { creditLimit: money(10000000, RUB) }), // -25 000
    account('history', 'cash', money(99999900, RUB), { system: 'importedHistory' }), // excluded
  ];
  const state = positions(accounts, []);

  it('net worth is every balance in the base currency, debts included, imported history excluded', () => {
    // 10 000 + 40 000 + 20 000 + 30 000 + 400 000 + 150 000 + 52 000 - 25 000 = 677 000 RUB
    expect(netWorth(state, basis)).toEqual(money(67700000, RUB));
  });

  it('available now is the available accounts minus credit-card debt', () => {
    // 10 000 + 40 000 + 20 000 + 30 000 - 25 000 = 75 000 RUB
    expect(availableNow(state, basis)).toEqual(money(7500000, RUB));
  });

  it('available now subtracts what is reserved for goals', () => {
    expect(availableNow(state, basis, money(2000000, RUB))).toEqual(money(5500000, RUB));
    expect(codeOf(() => availableNow(state, basis, money(1, USD)))).toBe('asset-mismatch');
  });

  it('an unused credit limit and an overpaid credit card are not available money', () => {
    const overpaid = positions(
      [
        card,
        account('credit', 'credit', money(300000, RUB), { creditLimit: money(10000000, RUB) }),
      ],
      [],
    );
    expect(availableNow(overpaid, basis)).toEqual(money(1000000, RUB));
    expect(netWorth(overpaid, basis)).toEqual(money(1300000, RUB));
  });

  it('a liquidity override moves an account in or out of available', () => {
    const overridden = positions(
      [
        account('wallet', 'crypto', money(1000000, BTC), { liquidityOverride: 'available' }),
        account('frozen', 'bank', money(500000, RUB), { liquidityOverride: 'locked' }),
      ],
      [],
    );
    expect(availableNow(overridden, basis)).toEqual(money(5200000, RUB));
  });

  it('a credit card overridden to available counts once, debt or not', () => {
    const debt = account('credit', 'credit', money(-250000, RUB), {
      liquidityOverride: 'available',
    });
    const surplus = account('credit', 'credit', money(300000, RUB), {
      liquidityOverride: 'available',
    });
    expect(availableNow(positions([card, debt], []), basis)).toEqual(money(750000, RUB));
    expect(availableNow(positions([card, surplus], []), basis)).toEqual(money(1300000, RUB));
  });

  it('reports in whatever base currency is asked', () => {
    // 677 000 RUB at 80 RUB per USD.
    expect(netWorth(state, { ...basis, baseCurrency: USD })).toEqual(money(846250, USD));
  });

  it('rounds the total once, not every account', () => {
    // Three accounts of 0.5 kopeck-worth each: 1.5 kopecks -> 2, while rounding each gives 0.
    const milli = cryptoAsset('MILLI', 3);
    const flat = [
      rate({ asset: 'MILLI', usdPrice: '0.0125', asOf: '2026-11-01', source: 'api' }),
      ...rates,
    ];
    const dust = positions(
      ['a', 'b', 'c'].map((id) => account(id, 'cash', money(5, milli))),
      [],
    );
    expect(netWorth(dust, { ...basis, rates: flat })).toEqual(money(2, RUB));
  });

  it('uses the rates of the basis date', () => {
    const later = [
      ...rates,
      rate({ asset: 'RUB', usdPrice: '0.01', asOf: '2026-11-10', source: 'manual' }),
    ];
    const usdOnly = positions([dollars], []);
    expect(netWorth(usdOnly, { ...basis, rates: later })).toEqual(money(5000000, RUB));
    expect(netWorth(usdOnly, { ...basis, rates: later, date: '2026-11-05' })).toEqual(
      money(4000000, RUB),
    );
  });

  it('needs a rate only for assets that actually hold something', () => {
    const jpy = fiatAsset('JPY');
    const empty = positions([card, account('yen', 'cash', zeroMoney(jpy))], []);
    expect(netWorth(empty, basis)).toEqual(money(1000000, RUB));
    const held = positions([card, account('yen', 'cash', money(1000, jpy))], []);
    expect(codeOf(() => netWorth(held, basis))).toBe('rate-missing');
  });

  it('needs no rate at all while every account is in the base currency', () => {
    const roubles = positions([card, account('credit', 'credit', money(-250000, RUB))], []);
    const noRates = { baseCurrency: RUB, rates: [], date: '2026-11-16' };
    expect(netWorth(roubles, noRates)).toEqual(money(750000, RUB));
    expect(availableNow(roubles, noRates)).toEqual(money(750000, RUB));
  });

  it('is zero with no accounts', () => {
    expect(netWorth([], basis)).toEqual(zeroMoney(RUB));
    expect(availableNow([], basis)).toEqual(zeroMoney(RUB));
  });
});
