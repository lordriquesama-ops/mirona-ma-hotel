# Fix: Room A56 Exists in Supabase But Not Showing in Dashboard

## Problem
Room A56 exists in Supabase and is being assigned to website bookings, but it's NOT showing in the admin dashboard's Rooms section.

## Possible Causes

### 1. Category Mismatch
A56's `category_id` or `category_name` doesn't match any category in the categories table.

**Check:**
- A56's category_id should be 'platinum'
- A56's category_name should be 'Presidential'
- The 'platinum' category must exist in the categories table

### 2. Filter Active
The Rooms page has filters that might be hiding A56:
- **Tab Filter**: Must be on "All" or "Presidential" tab
- **Status Filter**: Must be "All" or match A56's status
- **Search Box**: Must be empty or contain "A56"

### 3. A56 Shouldn't Exist
Presidential rooms (A prefix) are configured for only 8 rooms: A1-A8. A56 (the 56th Presidential room) is invalid.

## Diagnostic Steps

### Step 1: Run Diagnostic Script
```bash
cd websiste
node diagnose-room-a56.js
```

Or double-click: `diagnose-room-a56.bat`

This will tell you:
- If A56 exists in Supabase
- What category it belongs to
- If that category exists
- If A56 is beyond the expected range

### Step 2: Check Dashboard Filters
1. Open admin dashboard → Rooms section
2. Check the tab - click "All" tab
3. Check status filter - select "All"
4. Clear search box
5. Look for A56

### Step 3: Check Browser Console
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for any errors when loading rooms
4. Check if `getRooms()` is returning A56

## Fixes

### Fix 1: If A56's Category is Missing/Wrong

Run this SQL in Supabase SQL Editor:

```sql
-- Check A56's current category
SELECT id, name, category_id, category_name FROM rooms WHERE id = 'A56';

-- Fix A56's category if wrong
UPDATE rooms 
SET category_id = 'platinum', 
    category_name = 'Presidential'
WHERE id = 'A56';
```

### Fix 2: If A56 Shouldn't Exist (Recommended)

Presidential rooms should only be A1-A8. Delete A56:

```sql
-- Delete A56 from Supabase
DELETE FROM rooms WHERE id = 'A56';

-- Also delete any bookings for A56 (optional, if they're invalid)
DELETE FROM bookings WHERE room_id = 'A56';
```

Then clear browser cache:
```javascript
// Run in browser console (F12)
indexedDB.deleteDatabase('MironaDB');
// Then refresh page
```

### Fix 3: If You Want to Keep A56

If A56 is a legitimate custom room you added:

1. Make sure its category exists:
```sql
-- Check if platinum category exists
SELECT * FROM categories WHERE id = 'platinum';
```

2. Update A56's category to match:
```sql
UPDATE rooms 
SET category_id = 'platinum', 
    category_name = 'Presidential',
    price = 50000,
    color = 'bg-slate-800'
WHERE id = 'A56';
```

3. Clear browser cache and refresh

## Verify the Fix

1. Run diagnostic script again: `node diagnose-room-a56.js`
2. Open admin dashboard → Rooms
3. Click "All" tab
4. A56 should now be visible (if you kept it) or gone (if you deleted it)
5. Try making a website booking - should only assign valid rooms

## Prevent This in the Future

1. **Don't manually create rooms beyond the configured range**
   - Presidential (A): A1-A8 only
   - Suites (B): B1-B12 only
   - Deluxe (C): C1-C10 only
   - Safari: Use animal names only

2. **Use the admin dashboard to add rooms**
   - Go to Rooms → Inventory Mode
   - Click "Add Room"
   - System will validate the room number

3. **Keep categories in sync**
   - Don't delete categories that have rooms
   - Don't change category IDs manually in SQL

## Quick Decision Guide

**Should I delete A56?**
- ✅ YES if: It was created by mistake, you only want A1-A8
- ❌ NO if: It's a legitimate custom room you intentionally added

**Most common scenario:** A56 was created during testing or by accident. Delete it.
