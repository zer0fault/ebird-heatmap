import { openDB } from 'idb';

const DB_NAME = 'ebird-heatmap';
const STORE = 'observations';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CacheEntry<T> {
  data: T;
  ts: number; // Unix ms timestamp
}

export interface CacheInfo {
  fromCache: boolean;
  ts: number;
}

// Module-level singleton — one connection shared across all operations
const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE);
    }
  },
});

/** Returns the cached entry if it exists and hasn't expired, otherwise null. */
export async function getCached<T>(key: string): Promise<CacheEntry<T> | null> {
  const db = await dbPromise;
  const entry: CacheEntry<T> | undefined = await db.get(STORE, key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    await db.delete(STORE, key);
    return null;
  }
  return entry;
}

/** Stores data in the cache. Returns the timestamp that was persisted. */
export async function setCached<T>(key: string, data: T): Promise<number> {
  const db = await dbPromise;
  const ts = Date.now();
  const entry: CacheEntry<T> = { data, ts };
  await db.put(STORE, entry, key);
  return ts;
}

/** Clears all cached entries. */
export async function clearCache(): Promise<void> {
  const db = await dbPromise;
  await db.clear(STORE);
}
