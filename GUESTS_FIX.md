# Guests Directory - Data Fetching Fix

## ✅ What Was Fixed

### 1. Added Sync Manager Integration
**Before**: `getGuests()` only fetched from Supabase, no caching
**After**: Uses dual-read strategy with IndexedDB cache

```typescript
// Old code
if (USE_SUPABASE) {
  return await supabaseAdapter.getGuests();
}

// New code
return dualRead(
  () => supabaseAdapter.getGuests(),  // Fetch from Supabase
  async (guests) => { /* Cache in IndexedDB */ },
  () => getAll<Guest>('guests'),  // Fallback to cache
  'guests'
);
```

### 2. Improved Error Handling
**Before**: Returned empty array on error
**After**: Falls back to IndexedDB cache

### 3. Added Offline Support
**Before**: No data shown if Supabase fails
**After**: Shows cached data from IndexedDB

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console

Open DevTools (F12) and look for:
```
☁️ Fetching guests from Supabase...
✅ Fetched and cached X guests records
```

Or:
```
📦 Using cached guests
```

### Step 2: Run Test Script

In browser console, run:
```javascript
// Copy and paste test-guests-fetch.js content
```

This will show:
- How many guests are in Supabase
- How many are cached in IndexedDB
- Any errors or issues

### Step 3: Check Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Click "Table Editor"
3. Select "guests" table
4. Check if there are any rows

### Step 4: Check IndexedDB

1. Open DevTools (F12)
2. Go to "Application" tab
3. Expand "IndexedDB" → "MironaDB" → "guests"
4. Check if there are any entries

---

## 🚨 Common Issues & Solutions

### Issue 1: "No guests found"

**Cause**: Guests table is empty

**Solution**: 
1. Create a booking (guests are auto-created from bookings)
2. Or manually add a guest in Guests directory
3. Or sync from bookings using "Sync from Bookings" button

### Issue 2: "Supabase query error"

**Cause**: RLS policies blocking access

**Solution**:
```sql
-- Run in Supabase SQL Editor
DROP POLICY IF EXISTS "Allow all operations" ON guests;
CREATE POLICY "Allow all operations" ON guests 
FOR ALL USING (true) WITH CHECK (true);
```

### Issue 3: "Cache mismatch"

**Cause**: IndexedDB and Supabase out of sync

**Solution**:
```javascript
// In browser console
import { fullSync } from './services/sync-manager.js';
await fullSync();
```

### Issue 4: "UUID type mismatch"

**Cause**: Haven't run migration yet

**Solution**:
Run `PRODUCTION_SAFE_MIGRATION.sql` in Supabase SQL Editor

---

## 📊 Data Flow

```
Guests Component loads
    ↓
Calls getGuests()
    ↓
Sync Manager: dualRead()
    ↓
Check cache freshness
    ├─ Fresh? → Return from IndexedDB
    └─ Stale? → Continue
    ↓
Fetch from Supabase
    ↓
Cache in IndexedDB
    ↓
Return guests array
    ↓
Display in UI
```

---

## ✅ Verification Checklist

- [ ] Run migration (`PRODUCTION_SAFE_MIGRATION.sql`)
- [ ] Create at least one booking
- [ ] Check browser console for sync logs
- [ ] Verify guests appear in Guests directory
- [ ] Check Supabase Table Editor shows guests
- [ ] Check IndexedDB has cached guests
- [ ] Test offline mode (disable network, refresh page)

---

## 🔧 Manual Sync

If guests still don't appear, manually sync:

### Option 1: Use Sync Button
Click "Sync from Bookings" button in Guests directory

### Option 2: Console Command
```javascript
import { fullSync } from './services/sync-manager.js';
await fullSync();
```

### Option 3: Force Refresh
Press F5 to reload page and trigger auto-sync

---

## 📝 Expected Behavior

### When Guests Exist
- Guests directory shows list of all guests
- Each guest shows: name, phone, email, visits, total spent
- VIP badge for high-value guests
- Search and filter work correctly

### When No Guests
- Shows "No guests found" message
- Suggests creating a booking
- "Sync from Bookings" button available

### Offline Mode
- Shows cached guests from IndexedDB
- May show "(Cached)" indicator
- Cannot create/edit guests (requires internet)

---

## 🎯 Summary

✅ **Fixed**: getGuests() now uses sync manager
✅ **Added**: IndexedDB caching for offline support
✅ **Improved**: Error handling with fallback
✅ **Enhanced**: Auto-sync every 5 minutes

Your Guests directory should now display data correctly!

If you still see no data:
1. Check if you've created any bookings
2. Run the test script to diagnose
3. Verify Supabase connection
4. Check browser console for errors
