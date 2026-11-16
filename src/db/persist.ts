export type PersistResult = 'granted' | 'denied' | 'unsupported';

interface StorageLike {
  persist(): Promise<boolean>;
}

const KEY = 'fa.storagePersist';

function read(key: string): PersistResult | null {
  try {
    const v = localStorage.getItem(key);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

function write(key: string, value: PersistResult): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable: result simply is not remembered
  }
}

/** Asks for persistent storage once; the outcome is remembered. Denial is not an error. */
export async function requestPersistentStorage(
  storage: StorageLike | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.storage,
  key = KEY,
): Promise<PersistResult> {
  const known = read(key);
  if (known) return known;
  if (!storage || typeof storage.persist !== 'function') return 'unsupported';
  try {
    const result: PersistResult = (await storage.persist()) ? 'granted' : 'denied';
    write(key, result);
    return result;
  } catch {
    return 'denied';
  }
}
