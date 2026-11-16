import Dexie from 'dexie';
import { CURRENT_VERSION, DB_NAME, openDb, runMigrationFrom } from '@/db/db';
import { requestPersistentStorage } from '@/db/persist';

afterEach(async () => {
  await Dexie.delete(DB_NAME);
});

describe('db', () => {
  it('creates the current schema and a second open is idempotent', async () => {
    const first = await openDb();
    expect(first.verno).toBe(CURRENT_VERSION);
    first.close();
    const second = await openDb();
    expect(second.verno).toBe(CURRENT_VERSION);
    second.close();
  });

  it('migration harness upgrades a v(N-1) fixture to vN', async () => {
    const final = await runMigrationFrom(0);
    expect(final.verno).toBe(CURRENT_VERSION);
    final.close();
  });
});

describe('requestPersistentStorage', () => {
  it('stores granted result and calls persist once', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    const storage = { persist, persisted: vi.fn().mockResolvedValue(false) };
    expect(await requestPersistentStorage(storage)).toBe('granted');
    expect(await requestPersistentStorage(storage)).toBe('granted');
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('treats denial and missing API as non-errors', async () => {
    const denied = {
      persist: vi.fn().mockResolvedValue(false),
      persisted: vi.fn().mockResolvedValue(false),
    };
    expect(await requestPersistentStorage(denied, 'k1')).toBe('denied');
    expect(await requestPersistentStorage(undefined, 'k2')).toBe('unsupported');
  });
});
