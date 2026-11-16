import Dexie, { type Table } from 'dexie';
import type { Account } from '@/domain/accounts';
import type { Category } from '@/domain/categories';
import type { Rate } from '@/domain/fx';
import type { Transaction } from '@/domain/transactions';

export const DB_NAME = 'forgetamnesia';

/**
 * Migrations convention (forward-only):
 * - Never edit a released `version(N)`; add `version(N + 1)` with the full new schema and `.upgrade()`.
 * - Never delete or renumber versions; old clients must be able to upgrade step by step.
 * - Each migration gets a test that builds a fixture at v(N-1) via `runMigrationFrom` and checks vN.
 */
export const SCHEMA_VERSIONS: readonly {
  version: number;
  stores: Record<string, string | null>;
}[] = [
  { version: 1, stores: {} },
  {
    version: 2,
    stores: {
      accounts: 'id, kind',
      transactions: 'id, date, accountId, fromAccountId, toAccountId, categoryId',
      categories: 'id, parentId, kind',
      rates: 'id, asset',
    },
  },
];

/** A stored record: the domain entity, plus a tombstone once deleted (never erased, ADR-004). */
export type Stored<T> = T & { readonly deletedAt?: number };

/** A rate row; its id is `asset:asOf:source`, so the same rate from two devices is one record. */
export type RateRow = Rate & { readonly id: string };

export const CURRENT_VERSION = SCHEMA_VERSIONS.length;

export class AppDb extends Dexie {
  declare accounts: Table<Stored<Account>, string>;
  declare transactions: Table<Stored<Transaction>, string>;
  declare categories: Table<Stored<Category>, string>;
  declare rates: Table<Stored<RateRow>, string>;

  constructor(name = DB_NAME) {
    super(name);
    for (const { version, stores } of SCHEMA_VERSIONS) this.version(version).stores(stores);
  }
}

export async function openDb(name = DB_NAME): Promise<AppDb> {
  const db = new AppDb(name);
  await db.open();
  return db;
}

/**
 * Test harness: creates a database at `fromVersion` (0 = empty) using the released schemas,
 * then opens it with the current schema so every later migration runs.
 */
export async function runMigrationFrom(fromVersion: number, name = DB_NAME): Promise<AppDb> {
  if (fromVersion > 0) {
    const old = new Dexie(name);
    for (const { version, stores } of SCHEMA_VERSIONS.filter((s) => s.version <= fromVersion)) {
      old.version(version).stores(stores);
    }
    await old.open();
    old.close();
  }
  return openDb(name);
}

let shared: AppDb | undefined;
export function getDb(): AppDb {
  return (shared ??= new AppDb());
}
