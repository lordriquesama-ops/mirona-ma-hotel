/**
 * Sync Manager - Keeps IndexedDB and Supabase in sync
 *
 * Strategy:
 * 1. Supabase is the source of truth
 * 2. IndexedDB is the local cache + offline fallback
 * 3. When online  → write to Supabase first, cache in IndexedDB
 * 4. When offline → write to IndexedDB only, queue the operation
 * 5. When back online → flush queue to Supabase via upsert (safe, no duplicates)
 */

import { USE_SUPABASE } from './config';
import { supabaseAdapter } from './supabase-adapter';

// ---------------------------------------------------------------------------
// Cache freshness tracking
// ---------------------------------------------------------------------------
const cacheTimestamps: { [key: string]: number } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function isCacheFresh(key: string): boolean {
  const ts = cacheTimestamps[key];
  return !!ts && Date.now() - ts < CACHE_DURATION;
}

export function markCacheFresh(key: string): void {
  cacheTimestamps[key] = Date.now();
}

export function invalidateCache(key: string): void {
  delete cacheTimestamps[key];
}

export function clearAllCaches(): void {
  Object.keys(cacheTimestamps).forEach(k => delete cacheTimestamps[k]);
}

// ---------------------------------------------------------------------------
// Online / offline detection
// ---------------------------------------------------------------------------
let _online = navigator.onLine;

// Listeners can subscribe to connectivity changes
type ConnectivityListener = (online: boolean) => void;
const connectivityListeners: ConnectivityListener[] = [];

window.addEventListener('online', () => {
  _online = true;
  console.log('🌐 Back online – flushing offline queue...');
  connectivityListeners.forEach(fn => fn(true));
  flushOfflineQueue();
});

window.addEventListener('offline', () => {
  _online = false;
  console.log('📴 Gone offline – writes will queue to IndexedDB');
  connectivityListeners.forEach(fn => fn(false));
});

export function isOnline(): boolean {
  return _online;
}

export function onConnectivityChange(fn: ConnectivityListener): () => void {
  connectivityListeners.push(fn);
  return () => {
    const idx = connectivityListeners.indexOf(fn);
    if (idx !== -1) connectivityListeners.splice(idx, 1);
  };
}

// ---------------------------------------------------------------------------
// Offline queue (persisted in IndexedDB store "offline_queue")
// ---------------------------------------------------------------------------
export interface OfflineQueueItem {
  id: string;
  storeName: string;           // 'bookings' | 'rooms' | 'guests' | 'services' | 'users'
  operation: 'UPSERT' | 'DELETE';
  data: any;
  timestamp: string;
  retryCount: number;
}

const OFFLINE_QUEUE_STORE = 'offline_queue';

// Lazy DB handle – reuse the same connection as db.ts
let _db: IDBDatabase | null = null;
async function getQueueDB(): Promise<IDBDatabase> {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    // Open with same DB name/version as db.ts so we share the same database
    const req = indexedDB.open('MironaDB', 20);
    req.onsuccess = () => { _db = req.result; resolve(_db!); };
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id' });
      }
    };
  });
}

async function queuePut(item: OfflineQueueItem): Promise<void> {
  const db = await getQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readwrite');
    const req = tx.objectStore(OFFLINE_QUEUE_STORE).put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function queueGetAll(): Promise<OfflineQueueItem[]> {
  const db = await getQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readonly');
    const req = tx.objectStore(OFFLINE_QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function queueRemove(id: string): Promise<void> {
  const db = await getQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readwrite');
    const req = tx.objectStore(OFFLINE_QUEUE_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Add an operation to the offline queue.
 * Called by db.ts when a Supabase write fails due to being offline.
 */
export async function enqueueOfflineOp(
  storeName: string,
  operation: 'UPSERT' | 'DELETE',
  data: any
): Promise<void> {
  const item: OfflineQueueItem = {
    id: `oq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    storeName,
    operation,
    data,
    timestamp: new Date().toISOString(),
    retryCount: 0
  };
  await queuePut(item);
  console.log(`📥 Queued offline ${operation} on ${storeName}:`, data?.id || data?.name || '');
}

/**
 * Returns the number of pending offline operations.
 */
export async function getOfflineQueueCount(): Promise<number> {
  const items = await queueGetAll();
  return items.length;
}

// ---------------------------------------------------------------------------
// Flush offline queue → Supabase
// ---------------------------------------------------------------------------
let _flushing = false;

export async function flushOfflineQueue(): Promise<void> {
  if (!USE_SUPABASE || !_online || _flushing) return;
  _flushing = true;

  try {
    const items = await queueGetAll();
    if (items.length === 0) { _flushing = false; return; }

    console.log(`🔄 Flushing ${items.length} offline operations to Supabase...`);

    // Sort oldest-first so operations replay in order
    items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const item of items) {
      try {
        await applyToSupabase(item);
        await queueRemove(item.id);
        console.log(`✅ Flushed ${item.operation} ${item.storeName}:`, item.data?.id || '');
      } catch (err: any) {
        item.retryCount += 1;
        await queuePut(item);
        console.warn(`⚠️ Flush failed (retry ${item.retryCount}) for ${item.storeName}:`, err.message);
        // If network dropped again mid-flush, stop
        if (!_online) break;
      }
    }

    // After flush, invalidate caches so next read pulls fresh data from Supabase
    clearAllCaches();
    console.log('✅ Offline queue flushed. Caches invalidated.');
  } finally {
    _flushing = false;
  }
}

async function applyToSupabase(item: OfflineQueueItem): Promise<void> {
  const { storeName, operation, data } = item;

  if (operation === 'DELETE') {
    switch (storeName) {
      case 'bookings': return supabaseAdapter.deleteBooking(data.id);
      case 'rooms':    return supabaseAdapter.deleteRoom(data.id);
      case 'guests':   return supabaseAdapter.deleteGuest(data.id);
      case 'services': return supabaseAdapter.deleteService(data.id);
      case 'users':    return supabaseAdapter.deleteUser(data.id);
      default: console.warn('No Supabase delete handler for store:', storeName);
    }
    return;
  }

  // UPSERT
  switch (storeName) {
    case 'bookings': { await supabaseAdapter.saveBooking(data); return; }
    case 'rooms':    { await supabaseAdapter.updateRoom(data); return; }
    case 'guests':   { await supabaseAdapter.upsertGuest(data); return; }
    case 'services': { await supabaseAdapter.addService(data); return; }
    case 'users':    { await supabaseAdapter.updateUser(data); return; }
    default: console.warn('No Supabase upsert handler for store:', storeName);
  }
}

// ---------------------------------------------------------------------------
// Dual-read / dual-write helpers (used by db.ts)
// ---------------------------------------------------------------------------

export async function dualWrite<T>(
  supabaseWrite: () => Promise<T>,
  indexedDBWrite: () => Promise<void>,
  storeName: string
): Promise<T> {
  try {
    const result = await supabaseWrite();
    await indexedDBWrite();
    invalidateCache(storeName);
    return result;
  } catch (error) {
    console.error(`❌ Dual write failed for ${storeName}:`, error);
    throw error;
  }
}

export async function dualRead<T>(
  supabaseRead: () => Promise<T[]>,
  indexedDBWrite: (items: T[]) => Promise<void>,
  indexedDBRead: () => Promise<T[]>,
  storeName: string,
  clearStore?: () => Promise<void>
): Promise<T[]> {
  if (!USE_SUPABASE) return indexedDBRead();

  // If offline, always use cache
  if (!_online) {
    console.log(`📴 Offline – reading ${storeName} from IndexedDB cache`);
    return indexedDBRead();
  }

  try {
    if (isCacheFresh(storeName)) {
      return indexedDBRead();
    }

    const data = await supabaseRead();
    if (clearStore) await clearStore();
    await indexedDBWrite(data);
    markCacheFresh(storeName);
    return data;
  } catch (error) {
    console.error(`❌ Supabase read failed for ${storeName}, using cache:`, error);
    return indexedDBRead();
  }
}

// ---------------------------------------------------------------------------
// Full sync (Supabase → IndexedDB)
// ---------------------------------------------------------------------------
export async function fullSync(): Promise<void> {
  if (!USE_SUPABASE || !_online) return;

  try {
    const { getRooms, getBookings, getGuests, getServices, getRoomCategories, getUsers } = await import('./db');
    await Promise.all([getRooms(), getBookings(), getGuests(), getServices(), getRoomCategories(), getUsers()]);
    console.log('✅ Full sync completed');
  } catch (error) {
    console.error('❌ Full sync failed:', error);
  }
}

// ---------------------------------------------------------------------------
// Auto-sync init
// ---------------------------------------------------------------------------
export function initAutoSync(): void {
  if (!USE_SUPABASE) return;

  // Flush any queued ops from previous offline session immediately
  if (_online) {
    setTimeout(() => flushOfflineQueue(), 2000);
  }

  // Periodic full sync every 5 minutes (only when online)
  setInterval(() => {
    if (_online) fullSync();
  }, 5 * 60 * 1000);

  console.log('✅ Auto-sync initialized (offline-first mode)');
}

// ---------------------------------------------------------------------------
// Legacy helpers kept for compatibility
// ---------------------------------------------------------------------------
export async function syncFromSupabase(
  storeName: string,
  fetchFunction: () => Promise<any[]>,
  putFunction: (item: any) => Promise<void>
): Promise<void> {
  if (!USE_SUPABASE || !_online) return;
  try {
    const data = await fetchFunction();
    for (const item of data) await putFunction(item);
    markCacheFresh(storeName);
  } catch (error) {
    console.error(`❌ syncFromSupabase failed for ${storeName}:`, error);
  }
}
