import type { Table } from 'dexie';
import { v7 as uuidv7 } from 'uuid';
import { createAccount, type Account, type AccountInput } from '@/domain/accounts';
import { createCategory, defaultCategories, type Category } from '@/domain/categories';
import { DomainError } from '@/domain/errors';
import { rate, type Rate } from '@/domain/fx';
import { createTransaction, lookupContext, type Transaction } from '@/domain/transactions';
import type { AppDb, RateRow, Stored } from './db';

export type EntityTable = 'accounts' | 'transactions' | 'categories' | 'rates';

/** One committed change of one record. `delete` is a tombstone: `after` carries `deletedAt`. */
export interface WriteEvent {
  readonly table: EntityTable;
  readonly id: string;
  readonly kind: 'put' | 'delete';
  readonly before: unknown;
  readonly after: unknown;
}

/**
 * Called for every write, inside the Dexie transaction of that write: whatever it writes commits
 * or rolls back together with the record, and if it throws, the record is not written. M2 turns
 * each event into an `Op` here. It may only await Dexie operations (anything else ends the
 * IndexedDB transaction).
 */
export type OnWrite = (event: WriteEvent) => void | Promise<void>;

export interface RepositoryOptions {
  onWrite?: OnWrite;
  newId?: () => string;
  now?: () => number;
}

/**
 * The record does not exist or is deleted. Not named `NotFoundError`: Dexie replaces errors whose
 * `name` matches one of its own (that one included) with a DexieError when a transaction rejects.
 */
export class RecordNotFoundError extends Error {
  constructor(table: string, id: string) {
    super(`No live record "${id}" in ${table}`);
    this.name = 'RecordNotFoundError';
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewTransaction = DistributiveOmit<Transaction, 'id'>;
export type NewAccount = Omit<AccountInput, 'id'>;
export type AccountPatch = Partial<Omit<AccountInput, 'id' | 'asset'>>;
export type NewCategory = Omit<Category, 'id'>;
export type CategoryPatch = Partial<Pick<Category, 'name' | 'isMandatory' | 'order'>>;
export type RateKey = Pick<Rate, 'asset' | 'asOf' | 'source'>;

const isLive = (row: { deletedAt?: number }) => row.deletedAt === undefined;
const rateId = (key: RateKey) => `${key.asset}:${key.asOf}:${key.source}`;
const toRate = ({ asset, usdPrice, asOf, source }: RateRow): Rate => ({
  asset,
  usdPrice,
  asOf,
  source,
});

export function createRepositories(db: AppDb, options: RepositoryOptions = {}) {
  const { onWrite, newId = uuidv7, now = Date.now } = options;

  /**
   * The only function that writes an entity. `change` gets the stored record (or `undefined`)
   * and returns the new one; throwing from it or from `onWrite` aborts the whole transaction.
   */
  function commit<Row extends { id: string }>(
    table: Table<Row, string>,
    id: string,
    kind: WriteEvent['kind'],
    change: (before: Row | undefined) => Row | Promise<Row>,
  ): Promise<Row> {
    return db.transaction('rw', db.tables, async () => {
      const before = await table.get(id);
      const after = await change(before);
      await table.put(after);
      await onWrite?.({ table: table.name as EntityTable, id, kind, before, after });
      return after;
    });
  }

  function live<Row extends { deletedAt?: number }>(
    row: Row | undefined,
    table: string,
    id: string,
  ): Row {
    if (!row || !isLive(row)) throw new RecordNotFoundError(table, id);
    return row;
  }

  function reads<Row extends { id: string; deletedAt?: number }>(table: Table<Row, string>) {
    return {
      async get(id: string): Promise<Row | undefined> {
        const row = await table.get(id);
        return row && isLive(row) ? row : undefined;
      },
      list: (): Promise<Row[]> => table.filter(isLive).toArray(),
    };
  }

  function tombstone<Row extends { id: string; deletedAt?: number }>(
    table: Table<Row, string>,
    id: string,
    guard?: (row: Row) => void | Promise<void>,
  ): Promise<void> {
    return commit(table, id, 'delete', async (before) => {
      const row = live(before, table.name, id);
      await guard?.(row);
      return { ...row, deletedAt: now() };
    }).then(() => undefined);
  }

  const accounts = {
    ...reads<Stored<Account>>(db.accounts),
    add: (input: NewAccount): Promise<Account> => {
      const id = newId();
      return commit(db.accounts, id, 'put', () => createAccount({ ...input, id }));
    },
    update: (id: string, patch: AccountPatch): Promise<Account> =>
      commit(db.accounts, id, 'put', (before) =>
        createAccount({ ...live(before, 'accounts', id), ...patch, id }),
      ),
    remove: (id: string) => tombstone(db.accounts, id),
  };

  const categories = {
    ...reads<Stored<Category>>(db.categories),
    add: (input: NewCategory): Promise<Category> => {
      const id = newId();
      return commit(db.categories, id, 'put', async () =>
        createCategory({ ...input, id }, await categories.list()),
      );
    },
    update: (id: string, patch: CategoryPatch): Promise<Category> =>
      commit(db.categories, id, 'put', async (before) =>
        createCategory({ ...live(before, 'categories', id), ...patch }, await categories.list()),
      ),
    remove: (id: string) =>
      tombstone(db.categories, id, async (category) => {
        if (category.system) {
          throw new DomainError('category-invalid', 'A system category cannot be deleted');
        }
        const all = await categories.list();
        if (all.some((other) => other.parentId === id)) {
          throw new DomainError('category-invalid', 'Delete the child categories first');
        }
      }),
    /**
     * Adds the starting set. Idempotent: a default that already exists (renamed or even deleted)
     * is left alone, so it is safe on every start and on every device.
     */
    seedDefaults: (): Promise<void> =>
      db.transaction('rw', db.tables, async () => {
        for (const category of defaultCategories()) {
          if (!(await db.categories.get(category.id))) {
            await commit(db.categories, category.id, 'put', () => category);
          }
        }
      }),
  };

  /** A transaction is checked against the live accounts and categories before it is stored. */
  async function validated(input: NewTransaction, id: string): Promise<Transaction> {
    const ctx = lookupContext(await accounts.list(), await categories.list());
    return createTransaction({ ...input, id }, ctx);
  }

  const transactions = {
    ...reads<Stored<Transaction>>(db.transactions),
    add: (input: NewTransaction): Promise<Transaction> => {
      const id = newId();
      return commit(db.transactions, id, 'put', () => validated(input, id));
    },
    /** Replaces the whole transaction (its type may change), keeping the id. */
    update: (id: string, next: NewTransaction): Promise<Transaction> =>
      commit(db.transactions, id, 'put', (before) => {
        live(before, 'transactions', id);
        return validated(next, id);
      }),
    remove: (id: string) => tombstone(db.transactions, id),
  };

  const rates = {
    /** Adds the rate or replaces the one with the same asset, day and source. */
    put: async (input: Parameters<typeof rate>[0]): Promise<Rate> => {
      const valid = rate(input);
      const id = rateId(valid);
      return toRate(await commit(db.rates, id, 'put', () => ({ ...valid, id })));
    },
    remove: (key: RateKey) => tombstone(db.rates, rateId(key)),
    list: async (): Promise<Rate[]> => (await db.rates.filter(isLive).toArray()).map(toRate),
    listFor: async (asset: string): Promise<Rate[]> =>
      (await db.rates.where('asset').equals(asset).filter(isLive).toArray()).map(toRate),
  };

  return { accounts, transactions, categories, rates };
}

export type Repositories = ReturnType<typeof createRepositories>;
