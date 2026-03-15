/**
 * Sync Manager - Keeps IndexedDB and Supabase in sync
 * 
 * Strategy:
 * 1. Supabase is the source of truth
 * 2. IndexedDB is a local cache for offline support
 * 3. On every read, cache data locally
 * 4. On every write, update both Supabase and IndexedDB
 * 5. Periodic sync to ensure consistency
 */

import { USE_SUPABASE } from './config';
import { supabaseAdapter } from './supabase-adapter';

// Cache timestamps to track freshness
const cacheTimestamps: { [key: string]: number } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if cached data is still fresh
 */
export function isCacheFresh(key: string): boolean {
  const timestamp = cacheTimestamps[key];
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Mark cache as fresh
 */
export function markCacheFresh(key: string): void {
  cacheTimestamps[key] = Date.now();
}

/**
 * Invalidate cache for a specific key
 */
export function invalidateCache(key: string): void {
  delete cacheTimestamps[key];
}

/**
 * Sync data from Supabase to IndexedDB
 * This ensures IndexedDB has the latest data
 */
export async function syncFromSupabase(
  storeName: string,
  fetchFunction: () => Promise<any[]>,
  putFunction: (item: any) => Promise<void>
): Promise<void> {
  if (!USE_SUPABASE) return;

  try {
    console.log(`🔄 Syncing ${storeName} from Supabase to IndexedDB...`);
    
    // Fetch latest data from Supabase
    const data = await fetchFunction();
    
    // Update IndexedDB cache
    for (const item of data) {
      await putFunction(item);
    }
    
    markCacheFresh(storeName);
    console.log(`✅ Synced ${data.length} ${storeName} records`);
  } catch (error) {
    console.error(`❌ Sync failed for ${storeName}:`, error);
  }
}

/**
 * Dual-write strategy: Write to both Supabase and IndexedDB
 */
export async function dualWrite<T>(
  supabaseWrite: () => Promise<T>,
  indexedDBWrite: () => Promise<void>,
  storeName: string
): Promise<T> {
  try {
    // Write to Supabase first (source of truth)
    const result = await supabaseWrite();
    
    // Then update IndexedDB cache
    await indexedDBWrite();
    
    // Invalidate cache to force refresh on next read
    invalidateCache(storeName);
    
    return result;
  } catch (error) {
    console.error(`❌ Dual write failed for ${storeName}:`, error);
    throw error;
  }
}

/**
 * Dual-read strategy: Read from Supabase, cache in IndexedDB
 * Clears the IndexedDB store before writing to prevent ghost records
 */
export async function dualRead<T>(
  supabaseRead: () => Promise<T[]>,
  indexedDBWrite: (items: T[]) => Promise<void>,
  indexedDBRead: () => Promise<T[]>,
  storeName: string,
  clearStore?: () => Promise<void>  // optional clear function
): Promise<T[]> {
  if (!USE_SUPABASE) {
    return indexedDBRead();
  }

  try {
    if (isCacheFresh(storeName)) {
      console.log(`📦 Using cached ${storeName}`);
      return indexedDBRead();
    }

    console.log(`☁️ Fetching ${storeName} from Supabase...`);
    const data = await supabaseRead();
    
    // Clear stale IndexedDB records before writing fresh data
    // This prevents deleted records from reappearing
    if (clearStore) {
      await clearStore();
    }
    
    await indexedDBWrite(data);
    markCacheFresh(storeName);
    
    console.log(`✅ Fetched and cached ${data.length} ${storeName} records`);
    return data;
  } catch (error) {
    console.error(`❌ Supabase read failed for ${storeName}, falling back to cache:`, error);
    return indexedDBRead();
  }
}

/**
 * Full sync: Sync all data from Supabase to IndexedDB
 */
export async function fullSync(): Promise<void> {
  if (!USE_SUPABASE) {
    console.log('⚠️ Supabase disabled, skipping sync');
    return;
  }

  console.log('🔄 Starting full sync from Supabase to IndexedDB...');
  
  try {
    // Import functions dynamically to avoid circular dependencies
    const { getRooms, getBookings, getGuests, getServices, getRoomCategories, getUsers } = await import('./db');
    
    // Sync all data
    await Promise.all([
      getRooms(),
      getBookings(),
      getGuests(),
      getServices(),
      getRoomCategories(),
      getUsers()
    ]);
    
    console.log('✅ Full sync completed successfully');
  } catch (error) {
    console.error('❌ Full sync failed:', error);
  }
}

/**
 * Auto-sync on app start
 */
export function initAutoSync(): void {
  if (!USE_SUPABASE) return;

  // First, sync IndexedDB data to Supabase (one-time push)
  setTimeout(async () => {
    try {
      const { syncIndexedDBToSupabase } = await import('./db');
      await syncIndexedDBToSupabase();
      console.log('✅ Initial IndexedDB → Supabase sync completed');
    } catch (error) {
      console.error('❌ Initial sync failed:', error);
    }
    
    // Then start regular sync (Supabase → IndexedDB)
    fullSync();
  }, 1000);

  // Periodic sync every 5 minutes
  setInterval(() => {
    fullSync();
  }, 5 * 60 * 1000);

  console.log('✅ Auto-sync initialized');
}

/**
 * Clear all caches (force fresh fetch on next read)
 */
export function clearAllCaches(): void {
  Object.keys(cacheTimestamps).forEach(key => {
    delete cacheTimestamps[key];
  });
  console.log('🗑️ All caches cleared');
}
