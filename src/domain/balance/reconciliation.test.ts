import { createAccount } from '@/domain/accounts';
import { accountBalance, reconcile } from '@/domain/balance';
import { DomainError } from '@/domain/errors';
import { fiatAsset, money } from '@/domain/money';
import type { Transaction } from '@/domain/transactions';

const RUB = fiatAsset('RUB');
const USD = fiatAsset('USD');

const cash = createAccount({
  id: 'cash',
  name: 'Наличные',
  kind: 'cash',
  asset: RUB,
  openingBalance: money(1000000, RUB),
  openingDate: '2026-01-01',
});
const history: Transaction[] = [
  {
    id: 't1',
    type: 'expense',
    date: '2026-11-10',
    accountId: 'cash',
    amount: money(250000, RUB),
    usdPrice: '0.0125',
    categoryId: 'c',
  },
];
const details = { id: 'adj', date: '2026-11-16', usdPrice: '0.0125' };

describe('reconcile', () => {
  it('less money than recorded: a decreasing adjustment for the difference', () => {
    const adjustment = reconcile(cash, history, money(700000, RUB), details);
    expect(adjustment).toEqual({
      id: 'adj',
      type: 'adjustment',
      date: '2026-11-16',
      accountId: 'cash',
      amount: money(50000, RUB),
      direction: 'decrease',
      usdPrice: '0.0125',
    });
  });

  it('more money than recorded: an increasing adjustment', () => {
    const adjustment = reconcile(cash, history, money(760000, RUB), details);
    expect(adjustment?.direction).toBe('increase');
    expect(adjustment?.amount).toEqual(money(10000, RUB));
  });

  it('after the adjustment the balance is the real one', () => {
    for (const real of [
      money(700000, RUB),
      money(760000, RUB),
      money(-120000, RUB),
      money(0, RUB),
    ]) {
      const adjustment = reconcile(cash, history, real, details);
      expect(accountBalance(cash, adjustment ? [...history, adjustment] : history)).toEqual(real);
    }
  });

  it('no difference: nothing to record', () => {
    expect(reconcile(cash, history, money(750000, RUB), details)).toBeUndefined();
  });

  it('the real balance must be in the asset of the account', () => {
    expect(() => reconcile(cash, history, money(100, USD), details)).toThrow(DomainError);
  });

  it('validates the date and the price like any transaction', () => {
    expect(() =>
      reconcile(cash, history, money(1, RUB), { ...details, date: '2026-02-30' }),
    ).toThrow(DomainError);
    expect(() => reconcile(cash, history, money(1, RUB), { ...details, usdPrice: '0' })).toThrow(
      DomainError,
    );
  });
});
