# Clean Invalid Rooms from IndexedDB

## Problem
Room A56 exists in IndexedDB but not in Supabase. This causes the website to show rooms that don't actually exist.

## Why This Happened
IndexedDB (local browser cache) has old/invalid room data that was never synced to Supabase, or was created during testing.

## Solution: Clear IndexedDB Room Cache

### Option 1: Clear All IndexedDB Data (Recommended)
This will force the app to reload fresh data from Supabase.

**Run in Browser Console (F12):**
```javascript
// Clear all IndexedDB data
indexedDB.deleteDatabase('MironaDB');
console.log('✅ IndexedDB cleared. Refresh the page to reload from Supabase.');
```

Then refresh the page (F5). The app will reload all data from Supabase.

### Option 2: Clear Only Rooms
Keep other data but clear just the rooms.

**Run in Browser Console:**
```javascript
const clearRooms = async () => {
  const dbRequest = indexedDB.open('MironaDB');
  dbRequest.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction('rooms', 'readwrite');
    const store = transaction.objectStore('rooms');
    store.clear();
    console.log('✅ Rooms cleared from IndexedDB. Refresh to reload from Supabase.');
  };
};
clearRooms();
```

Then refresh the page.

### Option 3: Delete Specific Invalid Room (A56)
**Run in Browser Console:**
```javascript
const deleteA56 = async () => {
  const dbRequest = indexedDB.open('MironaDB');
  dbRequest.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction('rooms', 'readwrite');
    const store = transaction.objectStore('rooms');
    store.delete('A56');
    console.log('✅ Deleted A56 from IndexedDB');
  };
};
deleteA56();
```

## Ensure Supabase Has All Rooms

Run this to create any missing rooms in Supabase:

```bash
cd websiste
node sync-rooms-to-supabase.js
```

This will create the correct 38 rooms:
- Presidential (A1-A8): 8 rooms
- Suites (B1-B12): 12 rooms  
- Deluxe (C1-C10): 10 rooms
- Safari (Lion, Elephant, etc.): 8 rooms

## Verify the Fix

1. Clear IndexedDB (Option 1 above)
2. Run sync script to ensure Supabase has all rooms
3. Refresh your browser
4. Go to public website
5. Try making a booking
6. Should only show valid rooms (A1-A8, not A56)

## Why A56 Doesn't Exist

Presidential rooms (A prefix) are configured to have only 8 rooms: A1 through A8.

A56 would be the 56th Presidential room, which doesn't make sense. It was likely created by mistake or is leftover test data.

## Prevent This in the Future

The system now uses Supabase as the source of truth. IndexedDB is just a cache. When you:
1. Add a room in admin dashboard → Saves to Supabase first
2. View rooms on website → Reads from Supabase first
3. IndexedDB cache updates automatically

So this shouldn't happen again once you clear the old cache.
