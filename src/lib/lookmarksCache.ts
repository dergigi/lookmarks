import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_NAME = 'lookmarks-cache';
const DB_VERSION = 1;
const STORE_NAME = 'lookmarks';

// Cache entries expire after 5 minutes for stale-while-revalidate
const CACHE_TTL_MS = 5 * 60 * 1000;

// Generic cache entry to avoid circular dependency with useLookmarks
interface CacheEntry {
  key: string;
  lookmarkedEvents: unknown[];
  timestamp: number;
}

interface LookmarksCacheDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: CacheEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<LookmarksCacheDB>> | null = null;

/**
 * Gets or creates the IndexedDB database connection.
 * Returns null if IndexedDB is unavailable (e.g., private browsing).
 */
async function getDB(): Promise<IDBPDatabase<LookmarksCacheDB> | null> {
  if (typeof indexedDB === 'undefined') return null;

  if (!dbPromise) {
    dbPromise = openDB<LookmarksCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      },
    }).catch(() => null as unknown as IDBPDatabase<LookmarksCacheDB>);
  }

  return dbPromise;
}

/**
 * Creates a short hash from relay URLs for cache key differentiation.
 * This ensures cache entries are scoped to the current relay configuration.
 */
function hashRelayUrls(relayUrls: string[]): string {
  // Simple hash: sort URLs, join, and take first 8 chars of base64
  const sorted = [...relayUrls].sort().join('|');
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

/**
 * Generates a cache key for a lookmarks query.
 * Includes relay configuration hash to prevent stale data across account/relay switches.
 */
export function getCacheKey(
  pubkey?: string,
  pageParam?: number,
  relayUrls?: string[]
): string {
  const base = pubkey ?? 'global';
  const relayHash = relayUrls?.length ? hashRelayUrls(relayUrls) : 'default';
  const key = `${base}:${relayHash}`;
  return pageParam ? `${key}:${pageParam}` : key;
}

/**
 * Retrieves cached lookmarks if available and not expired.
 * Returns null if cache miss or expired.
 */
export async function getCachedLookmarks<T>(
  cacheKey: string
): Promise<T[] | null> {
  const db = await getDB();
  if (!db) return null;

  try {
    const entry = await db.get(STORE_NAME, cacheKey);
    if (!entry) return null;

    // Check if cache is still fresh
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL_MS) return null;

    return entry.lookmarkedEvents as T[];
  } catch {
    return null;
  }
}

/**
 * Retrieves stale cached lookmarks for stale-while-revalidate pattern.
 * Returns data even if expired, for immediate display while revalidating.
 */
export async function getStaleCachedLookmarks<T>(
  cacheKey: string
): Promise<{ data: T[]; isStale: boolean } | null> {
  const db = await getDB();
  if (!db) return null;

  try {
    const entry = await db.get(STORE_NAME, cacheKey);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const isStale = age > CACHE_TTL_MS;

    return { data: entry.lookmarkedEvents as T[], isStale };
  } catch {
    return null;
  }
}

/**
 * Stores lookmarks in the cache.
 */
export async function cacheLookmarks<T>(
  cacheKey: string,
  lookmarkedEvents: T[]
): Promise<void> {
  const db = await getDB();
  if (!db) return;

  try {
    await db.put(STORE_NAME, {
      key: cacheKey,
      lookmarkedEvents: lookmarkedEvents as unknown[],
      timestamp: Date.now(),
    });
  } catch {
    // Ignore cache write failures (quota exceeded, etc.)
  }
}

/**
 * Clears all cached lookmarks.
 */
export async function clearLookmarksCache(): Promise<void> {
  const db = await getDB();
  if (!db) return;

  try {
    await db.clear(STORE_NAME);
  } catch {
    // Ignore clear failures
  }
}
