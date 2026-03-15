# Data Synchronization Strategy

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                           │
│  (Dashboard, Bookings, Rooms, Guests, etc.)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   SYNC MANAGER                               │
│  • Dual-Read Strategy                                        │
│  • Dual-Write Strategy                                       │
│  • Cache Management                                          │
│  • Auto-Sync (every 5 minutes)                              │
└──────────┬────────────────────────────┬─────────────────────┘
           │                            │
           ↓                            ↓
┌──────────────────────┐    ┌──────────────────────┐
│   SUPABASE (Cloud)   │    │  IndexedDB (Local)   │
│  Source of Truth     │    │  Cache & Offline     │
│  • Rooms             │    │  • Rooms             │
│  • Bookings          │    │  • Bookings          │
│  • Guests            │    │  • Guests            │
│  • Services          │    │  • Services          │
│  • Users             │    │  • Users             │
│  • Categories        │    │  • Categories        │
└──────────────────────┘    └──────────────────────┘
```

---

## Sync Strategies

### 1. Dual-Read Strategy

**When**: Reading data (GET operations)

**Flow**:
```
1. Check if cache is fresh (< 5 minutes old)
   ├─ YES → Return from IndexedDB (fast)
   └─ NO  → Continue to step 2

2. Fetch from Supabase (source of truth)
   ├─ SUCCESS → Cache in IndexedDB → Return data
   └─ FAIL    → Fallback to IndexedDB cache
```

**Benefits**:
- Fast reads from local cache
- Always fresh data (5-minute window)
- Offline support (fallback to cache)

**Example**:
```typescript
const rooms = await getRooms();
// 1st call: Fetches from Supabase, caches locally
// 2nd call (within 5 min): Returns from cache instantly
// 3rd call (after 5 min): Fetches fresh data from Supabase
```

---

### 2. Dual-Write Strategy

**When**: Writing data (CREATE, UPDATE, DELETE)

**Flow**:
```
1. Write to Supabase first (source of truth)
   ├─ SUCCESS → Continue to step 2
   └─ FAIL    → Throw error, don't update cache

2. Update IndexedDB cache
   └─ Invalidate cache timestamp (force fresh fetch next time)
```

**Benefits**:
- Supabase always has latest data
- IndexedDB stays in sync
- Consistency guaranteed

**Example**:
```typescript
await addRoom(newRoom);
// 1. Saves to Supabase
// 2. Updates IndexedDB
// 3. Invalidates cache
// Next getRooms() will fetch fresh data
```

---

### 3. Auto-Sync

**When**: Automatically in background

**Schedule**:
- On app start (after 1 second)
- Every 5 minutes thereafter

**What it does**:
```
1. Fetches all data from Supabase:
   - Rooms
   - Bookings
   - Guests
   - Services
   - Categories
   - Users

2. Updates IndexedDB with latest data

3. Marks all caches as fresh
```

**Benefits**:
- Keeps data fresh even if user doesn't interact
- Syncs changes from other devices/users
- Ensures consistency across sessions

---

## Cache Management

### Cache Freshness

- **Duration**: 5 minutes
- **Check**: Before every read operation
- **Invalidation**: After every write operation

### Cache Keys

| Key | Data | Freshness |
|-----|------|-----------|
| `rooms` | All rooms | 5 min |
| `bookings` | All bookings | 5 min |
| `guests` | All guests | 5 min |
| `services` | All services | 5 min |
| `categories` | Room categories | 5 min |
| `users` | All users | 5 min |

---

## Data Flow Examples

### Example 1: Loading Dashboard

```
User opens Dashboard
    ↓
Dashboard calls getRooms()
    ↓
Sync Manager checks cache
    ├─ Cache fresh? NO
    ↓
Fetch from Supabase
    ↓
35 rooms returned
    ↓
Cache in IndexedDB
    ↓
Mark cache fresh
    ↓
Display "35 Available"
```

### Example 2: Creating a Booking

```
User creates booking
    ↓
saveBooking() called
    ↓
Sync Manager: Dual-Write
    ↓
1. Save to Supabase ✅
    ↓
2. Update IndexedDB ✅
    ↓
3. Invalidate cache
    ↓
Success!
```

### Example 3: Offline Mode

```
User loses internet
    ↓
Dashboard calls getRooms()
    ↓
Sync Manager tries Supabase
    ├─ Connection failed ❌
    ↓
Fallback to IndexedDB cache
    ↓
Return cached rooms
    ↓
Display data (may be stale)
```

---

## Consistency Guarantees

### ✅ What's Guaranteed

1. **Supabase is always source of truth**
   - All writes go to Supabase first
   - IndexedDB never overrides Supabase

2. **Data is fresh within 5 minutes**
   - Cache expires after 5 minutes
   - Auto-sync runs every 5 minutes

3. **Offline support**
   - App works with cached data
   - Syncs when connection restored

4. **No data loss**
   - Writes fail if Supabase fails
   - Cache only updated after successful write

### ⚠️ Known Limitations

1. **5-minute staleness window**
   - Cache may be up to 5 minutes old
   - Acceptable for most hotel operations

2. **No conflict resolution**
   - Last write wins
   - Multiple users editing same data may conflict

3. **No offline writes**
   - Writes require internet connection
   - Cannot create bookings offline

---

## Monitoring Sync Status

### Console Logs

```
✅ Synced 38 rooms records
✅ Fetched and cached 15 bookings records
📦 Using cached guests
☁️ Fetching services from Supabase...
🔄 Starting full sync from Supabase to IndexedDB...
```

### Check Sync Status

Open browser console and look for:
- `✅` = Success
- `❌` = Error
- `📦` = Using cache
- `☁️` = Fetching from cloud
- `🔄` = Syncing

---

## Manual Sync

### Force Full Sync

```typescript
import { fullSync } from './services/sync-manager';

// Force sync all data now
await fullSync();
```

### Clear All Caches

```typescript
import { clearAllCaches } from './services/sync-manager';

// Force fresh fetch on next read
clearAllCaches();
```

---

## Best Practices

### For Developers

1. **Always use db.ts functions**
   - Don't call Supabase directly
   - Let sync manager handle consistency

2. **Check console logs**
   - Monitor sync status
   - Watch for errors

3. **Test offline mode**
   - Disable network in DevTools
   - Verify app still works

### For Users

1. **Stay online for writes**
   - Creating bookings requires internet
   - Viewing data works offline

2. **Refresh if data looks stale**
   - Press F5 to force sync
   - Data updates every 5 minutes automatically

---

## Troubleshooting

### Data not syncing?

1. Check console for errors
2. Verify Supabase connection
3. Run `fullSync()` manually
4. Clear browser cache

### Seeing old data?

1. Wait 5 minutes for auto-sync
2. Refresh page (F5)
3. Clear caches with `clearAllCaches()`

### Offline mode not working?

1. Check if data was cached before going offline
2. Verify IndexedDB has data (DevTools → Application → IndexedDB)
3. Try accessing data while online first

---

## Summary

✅ **Supabase** = Source of truth (cloud)
✅ **IndexedDB** = Local cache (browser)
✅ **Sync Manager** = Keeps them consistent
✅ **Auto-Sync** = Updates every 5 minutes
✅ **Offline Support** = Works with cached data
✅ **Data Consistency** = Guaranteed within 5 minutes

Your data is now perfectly synced! 🎉
