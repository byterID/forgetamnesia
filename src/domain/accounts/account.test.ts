import { ACCOUNT_KINDS, createAccount, liquidityOf, type AccountKind } from '@/domain/accounts';
import { cryptoAsset, fiatAsset, money, zeroMoney } from '@/domain/money';
import { codeOf } from '@tests/support/code-of';

const RUB = fiatAsset('RUB');
const USD = fiatAsset('USD');

const base = {
  id: 'a1',
  name: 'Тбанк',
  kind: 'card',
  asset: RUB,
  openingDate: '2026-11-01',
} as const;

describe('createAccount', () => {
  it('holds money of exactly one asset, with an opening balance on a date', () => {
    const account = createAccount({ ...base, bank: 'Тбанк', openingBalance: money(1500000, RUB) });
    expect(account).toEqual({
      id: 'a1',
      name: 'Тбанк',
      bank: 'Тбанк',
      kind: 'card',
      asset: RUB,
      openingBalance: money(1500000, RUB),
      openingDate: '2026-11-01',
    });
  });

  it('opens at zero when no opening balance is given, and trims the name', () => {
    const account = createAccount({ ...base, name: '  Наличные ' });
    expect(account.openingBalance).toEqual(zeroMoney(RUB));
    expect(account.name).toBe('Наличные');
  });

  it('supports every account kind', () => {
    expect(ACCOUNT_KINDS).toEqual([
      'cash',
      'bank',
      'card',
      'credit',
      'savings',
      'locked',
      'investment',
      'crypto',
    ]);
    for (const kind of ACCOUNT_KINDS) expect(createAccount({ ...base, kind }).kind).toBe(kind);
  });

  it('keeps the fields of the advanced kinds as plain data', () => {
    const credit = createAccount({
      ...base,
      kind: 'credit',
      openingBalance: money(-2500000, RUB),
      creditLimit: money(10000000, RUB),
      paymentDay: 25,
    });
    expect(credit.creditLimit).toEqual(money(10000000, RUB));
    expect(credit.paymentDay).toBe(25);
    expect(createAccount({ ...base, kind: 'savings', annualRate: '12' }).annualRate).toBe('12');
    expect(createAccount({ ...base, kind: 'locked', unlockDate: '2028-01-01' }).unlockDate).toBe(
      '2028-01-01',
    );
    expect(
      createAccount({ ...base, kind: 'investment', valuation: money(900000, RUB) }).valuation,
    ).toEqual(money(900000, RUB));
  });

  it('can be the system account for imported history', () => {
    expect(createAccount({ ...base, system: 'importedHistory' }).system).toBe('importedHistory');
  });

  it('rejects a balance that is not a whole number of minor units, however it was built', () => {
    const float = { amount: 0.5, asset: RUB };
    expect(codeOf(() => createAccount({ ...base, openingBalance: float }))).toBe('amount-invalid');
    expect(codeOf(() => createAccount({ ...base, creditLimit: float }))).toBe('amount-invalid');
  });

  it('rejects an empty name, a foreign-asset balance and an impossible date', () => {
    expect(codeOf(() => createAccount({ ...base, name: '   ' }))).toBe('account-invalid');
    expect(codeOf(() => createAccount({ ...base, id: '' }))).toBe('account-invalid');
    expect(codeOf(() => createAccount({ ...base, openingBalance: money(1, USD) }))).toBe(
      'asset-mismatch',
    );
    expect(codeOf(() => createAccount({ ...base, creditLimit: money(1, USD) }))).toBe(
      'asset-mismatch',
    );
    expect(codeOf(() => createAccount({ ...base, valuation: money(1, USD) }))).toBe(
      'asset-mismatch',
    );
    expect(codeOf(() => createAccount({ ...base, openingDate: '2026-02-30' }))).toBe(
      'date-invalid',
    );
    expect(codeOf(() => createAccount({ ...base, unlockDate: 'soon' }))).toBe('date-invalid');
  });
});

describe('liquidityOf', () => {
  const of = (kind: AccountKind) => liquidityOf(createAccount({ ...base, kind }));

  it('derives liquidity from the account kind', () => {
    expect([of('cash'), of('bank'), of('card'), of('savings')]).toEqual([
      'available',
      'available',
      'available',
      'available',
    ]);
    expect(of('locked')).toBe('locked');
    expect([of('investment'), of('crypto')]).toEqual(['volatile', 'volatile']);
  });

  it('a credit card is outside liquidity: its debt is counted separately', () => {
    expect(of('credit')).toBeUndefined();
  });

  it('an override wins over the kind', () => {
    const stablecoins = createAccount({
      ...base,
      kind: 'crypto',
      asset: cryptoAsset('USDT', 6),
      liquidityOverride: 'available',
    });
    expect(liquidityOf(stablecoins)).toBe('available');
    expect(
      liquidityOf(createAccount({ ...base, kind: 'credit', liquidityOverride: 'available' })),
    ).toBe('available');
    expect(liquidityOf(createAccount({ ...base, kind: 'bank', liquidityOverride: 'locked' }))).toBe(
      'locked',
    );
  });
});
