import Dexie from 'dexie';
import { CURRENT_VERSION, openDb, runMigrationFrom, type AppDb } from '@/db/db';
import { createRepositories, RecordNotFoundError, type WriteEvent } from '@/db/repositories';
import { defaultCategories } from '@/domain/categories';
import { DomainError } from '@/domain/errors';
import { fiatAsset, money } from '@/domain/money';

const RUB = fiatAsset('RUB');
const USD = fiatAsset('USD');
const NAME = 'repositories-test';

let db: AppDb;
let events: WriteEvent[];

beforeEach(async () => {
  db = await openDb(NAME);
  events = [];
});

afterEach(async () => {
  db.close();
  await Dexie.delete(NAME);
});

function repos(options: Parameters<typeof createRepositories>[1] = {}) {
  return createRepositories(db, {
    onWrite: (event) => {
      events.push(event);
    },
    now: () => 1_800_000_000_000,
    ...options,
  });
}

/** Lists come back in primary-key order; the tests compare them as sets. */
const byId = <T extends { id: string }>(rows: T[]) =>
  [...rows].sort((a, b) => a.id.localeCompare(b.id));

const cardInput = {
  name: 'Карта',
  kind: 'card',
  asset: RUB,
  openingBalance: money(1000000, RUB),
  openingDate: '2026-01-01',
} as const;

async function seedBasics() {
  const { accounts, categories } = repos();
  const card = await accounts.add(cardInput);
  const dollars = await accounts.add({
    name: 'Доллары',
    kind: 'bank',
    asset: USD,
    openingDate: '2026-01-01',
  });
  const groceries = await categories.add({ name: 'Продукты', kind: 'expense', order: 0 });
  events = [];
  return { card, dollars, groceries };
}

describe('schema v2', () => {
  it('upgrades a v1 database and gets the entity tables', async () => {
    db.close();
    await Dexie.delete(NAME);
    db = await runMigrationFrom(1, NAME);
    expect(db.verno).toBe(CURRENT_VERSION);
    expect(CURRENT_VERSION).toBeGreaterThanOrEqual(2);
    expect(db.tables.map((table) => table.name).sort()).toEqual(
      expect.arrayContaining(['accounts', 'categories', 'rates', 'transactions']),
    );
  });
});

describe('accounts repository', () => {
  it('adds an account with a UUID v7 id and reads it back', async () => {
    const { accounts } = repos();
    const card = await accounts.add(cardInput);
    expect(card.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(card).toEqual({ ...cardInput, id: card.id });
    expect(await accounts.get(card.id)).toEqual(card);
    expect(await accounts.list()).toEqual([card]);
  });

  it('rejects an invalid account and writes nothing', async () => {
    const { accounts } = repos();
    await expect(accounts.add({ ...cardInput, name: ' ' })).rejects.toBeInstanceOf(DomainError);
    expect(await accounts.list()).toEqual([]);
    expect(events).toEqual([]);
  });

  it('updates fields, re-validating the whole account', async () => {
    const { accounts } = repos();
    const card = await accounts.add(cardInput);
    const renamed = await accounts.update(card.id, { name: 'Тбанк', bank: 'Тбанк' });
    expect(renamed).toEqual({ ...card, name: 'Тбанк', bank: 'Тбанк' });
    expect(await accounts.get(card.id)).toEqual(renamed);
    await expect(
      accounts.update(card.id, { openingBalance: money(1, USD) }),
    ).rejects.toBeInstanceOf(DomainError);
    await expect(accounts.update('missing', { name: 'X' })).rejects.toBeInstanceOf(
      RecordNotFoundError,
    );
  });

  it('deletes with a tombstone: the record stays, the lists forget it', async () => {
    const { accounts } = repos();
    const card = await accounts.add(cardInput);
    await accounts.remove(card.id);
    expect(await accounts.get(card.id)).toBeUndefined();
    expect(await accounts.list()).toEqual([]);
    expect(await db.accounts.get(card.id)).toEqual({ ...card, deletedAt: 1_800_000_000_000 });
    await expect(accounts.remove(card.id)).rejects.toBeInstanceOf(RecordNotFoundError);
  });
});

describe('transactions repository', () => {
  it('stores a valid transaction and reads it back', async () => {
    const { card, groceries } = await seedBasics();
    const { transactions } = repos();
    const expense = await transactions.add({
      type: 'expense',
      date: '2026-11-16',
      accountId: card.id,
      amount: money(125050, RUB),
      usdPrice: '0.0125',
      categoryId: groceries.id,
    });
    expect(await transactions.get(expense.id)).toEqual(expense);
    expect(await transactions.list()).toEqual([expense]);
  });

  it('rejects a transaction the domain refuses, and writes nothing', async () => {
    const { card, groceries } = await seedBasics();
    const { transactions } = repos();
    const wrongAsset = transactions.add({
      type: 'expense',
      date: '2026-11-16',
      accountId: card.id,
      amount: money(100, USD),
      usdPrice: '1',
      categoryId: groceries.id,
    });
    await expect(wrongAsset).rejects.toMatchObject({ code: 'asset-mismatch' });
    expect(await transactions.list()).toEqual([]);
    expect(events).toEqual([]);
  });

  it('does not accept a transaction on a deleted account', async () => {
    const { card, groceries } = await seedBasics();
    const { accounts, transactions } = repos();
    await accounts.remove(card.id);
    await expect(
      transactions.add({
        type: 'expense',
        date: '2026-11-16',
        accountId: card.id,
        amount: money(100, RUB),
        usdPrice: '0.0125',
        categoryId: groceries.id,
      }),
    ).rejects.toMatchObject({ code: 'transaction-invalid' });
  });

  it('replaces a transaction on update and tombstones it on remove', async () => {
    const { card, dollars, groceries } = await seedBasics();
    const { transactions } = repos();
    const expense = await transactions.add({
      type: 'expense',
      date: '2026-11-16',
      accountId: card.id,
      amount: money(125050, RUB),
      usdPrice: '0.0125',
      categoryId: groceries.id,
    });
    const exchange = await transactions.update(expense.id, {
      type: 'transfer',
      date: '2026-11-17',
      fromAccountId: card.id,
      toAccountId: dollars.id,
      sent: money(810000, RUB),
      received: money(10000, USD),
      sentUsdPrice: '0.0125',
      receivedUsdPrice: '1',
    });
    expect(exchange.id).toBe(expense.id);
    expect(await transactions.list()).toEqual([exchange]);

    await transactions.remove(expense.id);
    expect(await transactions.list()).toEqual([]);
    expect(await db.transactions.count()).toBe(1);
    await expect(transactions.update(expense.id, exchange)).rejects.toBeInstanceOf(
      RecordNotFoundError,
    );
  });
});

describe('categories repository', () => {
  it('adds, renames and lists categories, validating the tree', async () => {
    const { categories } = repos();
    const housing = await categories.add({ name: 'Жильё', kind: 'expense', order: 0 });
    const rent = await categories.add({
      name: 'Аренда',
      kind: 'expense',
      parentId: housing.id,
      order: 0,
    });
    await expect(
      categories.add({ name: 'Офис', kind: 'expense', parentId: rent.id, order: 0 }),
    ).rejects.toMatchObject({ code: 'category-invalid' });
    const mandatory = await categories.update(rent.id, { isMandatory: true, name: 'Аренда жилья' });
    expect(mandatory).toEqual({ ...rent, isMandatory: true, name: 'Аренда жилья' });
    expect(byId(await categories.list())).toEqual(byId([housing, mandatory]));
  });

  it('removes a leaf, but not a parent with children nor a system category', async () => {
    const { categories } = repos();
    await categories.seedDefaults();
    await expect(categories.remove('default:expense:housing')).rejects.toMatchObject({
      code: 'category-invalid',
    });
    await expect(categories.remove('default:expense:unaccounted')).rejects.toMatchObject({
      code: 'category-invalid',
    });
    await categories.remove('default:expense:housing:deposit');
    expect((await categories.list()).map((category) => category.id)).not.toContain(
      'default:expense:housing:deposit',
    );
  });

  it('seeds the starting set once: repeating it changes nothing and respects deletions', async () => {
    const { categories } = repos();
    await categories.seedDefaults();
    expect(byId(await categories.list())).toEqual(byId(defaultCategories()));
    expect(events).toHaveLength(defaultCategories().length);

    await categories.update('default:expense:groceries', { name: 'Еда' });
    await categories.remove('default:expense:gifts');
    events = [];
    await categories.seedDefaults();
    expect(events).toEqual([]);
    const list = await categories.list();
    expect(list.find((category) => category.id === 'default:expense:groceries')?.name).toBe('Еда');
    expect(list.some((category) => category.id === 'default:expense:gifts')).toBe(false);
  });
});

describe('rates repository', () => {
  it('keeps one rate per asset, day and source', async () => {
    const { rates } = repos();
    await rates.put({ asset: 'RUB', usdPrice: '0.0125', asOf: '2026-11-16', source: 'api' });
    await rates.put({ asset: 'RUB', usdPrice: '0.0126', asOf: '2026-11-16', source: 'api' });
    await rates.put({ asset: 'RUB', usdPrice: '0.013', asOf: '2026-11-16', source: 'manual' });
    await rates.put({ asset: 'AMD', usdPrice: '0.0025', asOf: '2026-11-16', source: 'api' });
    expect(await rates.listFor('RUB')).toEqual([
      { asset: 'RUB', usdPrice: '0.0126', asOf: '2026-11-16', source: 'api' },
      { asset: 'RUB', usdPrice: '0.013', asOf: '2026-11-16', source: 'manual' },
    ]);
    expect(await rates.list()).toHaveLength(3);
  });

  it('rejects an invalid rate and can drop a manual one', async () => {
    const { rates } = repos();
    await expect(
      rates.put({ asset: 'RUB', usdPrice: '0', asOf: '2026-11-16', source: 'api' }),
    ).rejects.toMatchObject({ code: 'rate-invalid' });
    const manual = await rates.put({
      asset: 'RUB',
      usdPrice: '0.013',
      asOf: '2026-11-16',
      source: 'manual',
    });
    await rates.remove(manual);
    expect(await rates.list()).toEqual([]);
    await expect(rates.remove(manual)).rejects.toBeInstanceOf(RecordNotFoundError);
  });
});

describe('onWrite', () => {
  it('receives every write with the record before and after', async () => {
    const { accounts } = repos();
    const card = await accounts.add(cardInput);
    const renamed = await accounts.update(card.id, { name: 'Тбанк' });
    await accounts.remove(card.id);
    expect(events).toEqual([
      { table: 'accounts', id: card.id, kind: 'put', before: undefined, after: card },
      { table: 'accounts', id: card.id, kind: 'put', before: card, after: renamed },
      {
        table: 'accounts',
        id: card.id,
        kind: 'delete',
        before: renamed,
        after: { ...renamed, deletedAt: 1_800_000_000_000 },
      },
    ]);
  });

  it('runs inside the transaction of the write: it can write too, atomically', async () => {
    const { accounts } = repos({
      onWrite: async (event) => {
        // Stand-in for the M2 op log: another record written by the hook itself.
        if (event.table === 'accounts') {
          await db.rates.put({
            id: 'hook',
            asset: 'HOOK',
            usdPrice: '1',
            asOf: '2026-11-16',
            source: 'api',
          });
        }
      },
    });
    await accounts.add(cardInput);
    expect(await db.rates.get('hook')).toBeDefined();
  });

  it('a failing hook rolls the write back', async () => {
    const { accounts } = repos({
      onWrite: () => {
        throw new Error('op log is full');
      },
    });
    await expect(accounts.add(cardInput)).rejects.toThrow('op log is full');
    expect(await db.accounts.count()).toBe(0);
  });

  it('is optional', async () => {
    const { accounts } = createRepositories(db);
    await expect(accounts.add(cardInput)).resolves.toMatchObject({ name: 'Карта' });
  });
});
