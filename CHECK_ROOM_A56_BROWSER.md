# Check Room A56 in Browser

## Quick Check - Run in Browser Console

Open your browser console (F12) and paste this code:

```javascript
// Check IndexedDB for room A56
const checkRoomA56 = async () => {
  const dbRequest = indexedDB.open('MironaDB');
  
  dbRequest.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction('rooms', 'readonly');
    const store = transaction.objectStore('rooms');
    const request = store.get('A56');
    
    request.onsuccess = () => {
      if (request.result) {
        console.log('✅ Room A56 found in IndexedDB:');
        console.log(request.result);
      } else {
        console.log('❌ Room A56 NOT found in IndexedDB');
      }
    };
    
    // Also get all A-prefix rooms
    const allRequest = store.getAll();
    allRequest.onsuccess = () => {
      const aRooms = allRequest.result.filter(r => r.id.startsWith('A'));
      console.log(`\n📋 All A-prefix rooms in IndexedDB (${aRooms.length}):`);
      aRooms.forEach(r => console.log(`   ${r.id} - ${r.name} (${r.categoryName})`));
    };
  };
  
  dbRequest.onerror = () => {
    console.error('❌ Failed to open IndexedDB');
  };
};

checkRoomA56();
```

## Check Supabase

Run this in your terminal:

```bash
cd websiste
node check-room-a56.js
```

Or double-click: `check-room-a56.bat`

## What to Look For

### If A56 exists in IndexedDB but NOT Supabase:
- Room was created locally but never synced to cloud
- Need to sync it to Supabase

### If A56 exists in Supabase but NOT IndexedDB:
- Room exists in cloud but not cached locally
- Refresh the page to load it from Supabase

### If A56 doesn't exist in either:
- Room was never created
- Check if it should be A5 or A6 instead
- Presidential rooms (A prefix) should only go up to A8 by default

## Default Room Configuration

According to the system setup:
- **A prefix (Presidential)**: A1 to A8 (8 rooms)
- **B prefix (Suites)**: B1 to B12 (12 rooms)
- **C prefix (Deluxe)**: C1 to C10 (10 rooms)
- **Safari rooms**: Lion, Elephant, Leopard, etc. (8 rooms)

**A56 should NOT exist** - Presidential rooms only go up to A8.

## Possible Issues

1. **Typo**: Maybe you meant A5 or A6?
2. **Wrong category**: Maybe it's B56 or C56?
3. **Custom room**: Was A56 manually created?

## Fix if A56 Shouldn't Exist

If A56 was created by mistake and is causing issues:

```javascript
// Delete A56 from IndexedDB (run in browser console)
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

Then in Supabase SQL Editor:
```sql
DELETE FROM rooms WHERE id = 'A56';
```
