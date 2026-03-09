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

function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
}

/** Returns the cached entry if it exists and hasn't expired, otherwise null. */
export async function getCached<T>(key: string): Promise<CacheEntry<T> | null> {
  const db = await getDB();
  const entry: CacheEntry<T> | undefined = await db.get(STORE, key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    await db.delete(STORE, key);
    return null;
  }
  return entry;
}

/** Stores data in the cache with the current timestamp. */
export async function setCached<T>(key: string, data: T): Promise<void> {
  const db = await getDB();
  const entry: CacheEntry<T> = { data, ts: Date.now() };
  await db.put(STORE, entry, key);
}

/** Clears all cached entries. */
export async function clearCache(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE);
}
