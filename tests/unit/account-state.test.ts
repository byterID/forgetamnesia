import { createAccount, type Account, type AccountKind } from '@/domain/accounts';
import { availableNow, netWorth, positions } from '@/domain/balance';
import { rate } from '@/domain/fx';
import { Dec, fiatAsset, isZero, parseMoney, type Asset } from '@/domain/money';
import fixture from '../fixtures/account-state.json';

const RUB = fiatAsset('RUB');
const USD = fiatAsset('USD');
const AMD = fiatAsset('AMD');

/**
 * The sheet is read the way the M4 import will read it (docs/spec/import.md I1): one account per
 * bank + currency, IIS rubles -> `locked`, the "Крипта" row -> `crypto` in its USD equivalent.
 */
function accountsOf(sheet: typeof fixture): Account[] {
  const columns: { key: 'amd' | 'rub' | 'usd' | 'lockedRub'; asset: Asset; kind?: AccountKind }[] =
    [
      { key: 'amd', asset: AMD },
      { key: 'rub', asset: RUB },
      { key: 'usd', asset: USD },
      { key: 'lockedRub', asset: RUB, kind: 'locked' },
    ];
  return sheet.rows.flatMap((row) =>
    columns
      .map(({ key, asset, kind }) =>
        createAccount({
          id: `${row.bank}:${key}`,
          name: `${row.bank} ${asset.code}`,
          bank: row.bank,
          kind: kind ?? (row.bank === 'Крипта' ? 'crypto' : 'bank'),
          asset,
          openingBalance: parseMoney(row[key], asset),
          openingDate: sheet.asOf,
        }),
      )
      .filter((account) => !isZero(account.openingBalance)),
  );
}

/** The sheet keeps "RUB per unit"; the app keeps the USD price of every asset (ADR-006). */
function ratesOf(sheet: typeof fixture) {
  const usdRub = new Dec(sheet.rates.usdRub);
  return [
    rate({ asset: 'RUB', usdPrice: new Dec(1).div(usdRub), asOf: sheet.asOf, source: 'manual' }),
    rate({
      asset: 'AMD',
      usdPrice: new Dec(sheet.rates.amdRub).div(usdRub),
      asOf: sheet.asOf,
      source: 'manual',
    }),
  ];
}

describe('account-state fixture (anonymised sheet of the user)', () => {
  const accounts = accountsOf(fixture);
  const state = positions(accounts, []);
  const valuation = { base: RUB, rates: ratesOf(fixture), date: fixture.asOf };

  it('becomes one account per bank and currency', () => {
    expect(accounts.map((account) => `${account.name} ${account.kind}`)).toEqual([
      'Ardshin AMD bank',
      'Ardshin USD bank',
      'Fast bank AMD bank',
      'Тбанк RUB bank',
      'Тбанк RUB locked',
      'Озон банк RUB bank',
      'ВТБ RUB bank',
      'ВТБ USD bank',
      'Крипта USD crypto',
    ]);
  });

  it('net worth equals the total of the sheet formula, to the kopeck', () => {
    expect(netWorth(state, valuation)).toEqual(parseMoney(fixture.expected.totalRub, RUB));
  });

  it('available now leaves out the locked IIS rubles and the crypto', () => {
    expect(availableNow(state, valuation)).toEqual(parseMoney(fixture.expected.availableRub, RUB));
  });
});
