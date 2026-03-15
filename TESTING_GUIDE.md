# 🧪 Testing Guide - After Migration

## Quick Test Checklist

### 1. Test Rooms (2 minutes)
```
✅ View all rooms → Should show 38 rooms
✅ Create room "TEST1" → Should save without errors
✅ Update room status → Should update in Supabase
✅ Delete test room → Should delete from Supabase
```

### 2. Test Bookings (3 minutes)
```
✅ Create new booking → Should save to Supabase
✅ View bookings → Should show newest first
✅ Update booking status → Should update in Supabase
✅ Check-in guest → Should update room status
✅ Delete booking → Should delete from Supabase
```

### 3. Test Guests (2 minutes)
```
✅ View guests → Should show all guests
✅ Create booking → Should auto-create guest
✅ Check guest stats → Should show visits & total spent
✅ Update guest info → Should update in Supabase
```

### 4. Test Services (2 minutes)
```
✅ View services → Should fetch from Supabase
✅ Add new service → Should save to Supabase
✅ Delete service → Should delete from Supabase
```

### 5. Test Sync (2 minutes)
```
✅ Check top bar → Should show sync button
✅ Click sync button → Should show spinning animation
✅ Wait for completion → Should show green checkmark
✅ Check console → Should show sync messages
```

### 6. Test Financial Reports (2 minutes)
```
✅ View financial ledger → Today should be on top
✅ Check guest count → Should match bookings
✅ Check revenue → Should match booking amounts
✅ View graphs → Should show real data
```

---

## Expected Results

### Console Messages (Good Signs)
```
✅ Synced 38 rooms records
✅ Booking saved to Supabase: [id]
✅ Guest saved to Supabase: [id]
✅ Room updated in Supabase: [id]
📦 Using cached rooms
☁️ Fetching bookings from Supabase...
```

### Console Messages (Bad Signs)
```
❌ Supabase saveBooking failed: [error]
❌ UUID type mismatch
❌ Foreign key constraint violation
```

---

## Troubleshooting

### If you see UUID errors:
→ Migration not run yet. Run `PRODUCTION_SAFE_MIGRATION.sql`

### If data not syncing:
→ Check internet connection
→ Click manual sync button
→ Refresh page (F5)

### If seeing old data:
→ Wait 5 minutes for auto-sync
→ Click manual sync button
→ Clear browser cache

---

## Success Criteria

Your system is working correctly if:
- ✅ No errors in console
- ✅ Can create rooms with TEXT IDs
- ✅ Bookings save to Supabase
- ✅ Guests auto-created from bookings
- ✅ Sync button works
- ✅ Financial reports show real data
- ✅ Room count: 35 available (correct)

---

**Total Testing Time**: 15 minutes
**When to Test**: After running migration
**What to Check**: All CRUD operations + sync
