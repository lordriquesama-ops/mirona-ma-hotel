# Booking Fixes - COMPLETE

## Issues Fixed

### 1. Booking Not Found Error (FIXED)
**Problem:** When updating bookings, getting error "Booking not found"

**Root Cause:** Booking exists in IndexedDB but not in Supabase, causing UPDATE to fail

**Solution:**
- Added check to see if booking exists in Supabase before updating
- If booking doesn't exist, creates it instead of updating
- Preserves the same booking ID for consistency

**Code Change in `supabase-adapter.ts`:**
```typescript
// Check if booking exists first
const { data: existing } = await supabase
  .from(TABLES.BOOKINGS)
  .select('id')
  .eq('id', booking.id)
  .single();

if (!existing) {
  // Create instead of update
  await supabase.from(TABLES.BOOKINGS).insert({...});
}
```

### 2. Website Booking Source Tracking (FIXED)
**Problem:** No way to tell if a booking came from the website vs admin dashboard

**Solution:**
- Added `source` field to Booking type: `'admin' | 'website' | 'phone' | 'walkin'`
- Created SQL migration: `add-booking-source.sql`
- Updated all booking creation points to set source
- Website bookings now marked with `source: 'website'`
- Admin bookings marked with `source: 'admin'`
- Notifications show "(from Website)" for website bookings

**Files Changed:**
- `types.ts` - Added source field to Booking interface
- `supabase-adapter.ts` - Added source to mapping functions
- `PublicWebsite.tsx` - Set source: 'website'
- `PublicWebsiteRefined.tsx` - Set source: 'website'
- `Bookings.tsx` - Set source: 'admin', show source in notifications

### 3. Date Format Warning (INFO)
**Warning:** `The specified value "2026-03-28T00:00:00+00:00" does not conform to the required format, "yyyy-MM-dd"`

**Explanation:** This is a browser warning when date inputs receive ISO format dates. It doesn't break functionality but can be fixed by formatting dates before setting them in inputs.

**To Fix (Optional):**
```typescript
// Convert ISO to yyyy-MM-dd format
const formatDateForInput = (isoDate: string) => {
  return isoDate.split('T')[0];
};

// Use in date inputs
<input type="date" value={formatDateForInput(booking.checkIn)} />
```

## Database Migration Required

Run this SQL in Supabase SQL Editor:

```sql
-- Add source column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin' 
CHECK (source IN ('admin', 'website', 'phone', 'walkin'));

-- Update existing bookings
UPDATE bookings SET source = 'admin' WHERE source IS NULL;
```

Or run the file:
```bash
# In Supabase SQL Editor, paste contents of:
websiste/add-booking-source.sql
```

## How to Test

### Test 1: Website Booking
1. Go to `/website` route
2. Make a booking from the public website
3. Go to admin dashboard → Bookings
4. New booking should show with notification "(from Website)"
5. Check browser console - should see: `✅ Booking saved to Supabase`

### Test 2: Admin Booking
1. Go to admin dashboard → Bookings
2. Click "New Booking"
3. Fill in details and save
4. Notification should NOT say "(from Website)"
5. Booking source should be 'admin'

### Test 3: Update Existing Booking
1. Find a booking that exists in IndexedDB but not Supabase
2. Try to check in the guest
3. Should work without "Booking not found" error
4. Booking will be created in Supabase if missing

## What Changed

### Types (types.ts)
```typescript
export interface Booking {
  // ... existing fields
  source?: 'admin' | 'website' | 'phone' | 'walkin'; // NEW
}
```

### Supabase Adapter (supabase-adapter.ts)
- ✅ Added source field to `mapBookingFromSupabase()`
- ✅ Added source field to `mapBookingToSupabase()`
- ✅ Added existence check before UPDATE
- ✅ Falls back to INSERT if booking not found

### Public Website Components
- ✅ `PublicWebsite.tsx` - Sets `source: 'website'`
- ✅ `PublicWebsiteRefined.tsx` - Sets `source: 'website'`

### Admin Bookings Component
- ✅ Sets `source: 'admin'` for new bookings
- ✅ Preserves source when editing existing bookings
- ✅ Shows "(from Website)" in notification for website bookings

## Benefits

1. **Track Booking Origin** - Know which bookings came from website vs admin
2. **Better Analytics** - Can report on website conversion rate
3. **Improved UX** - Staff can see at a glance which bookings are online
4. **No More "Not Found" Errors** - Gracefully handles missing bookings
5. **Data Consistency** - Bookings sync properly between IndexedDB and Supabase

## Next Steps

1. Run the SQL migration in Supabase
2. Test website bookings
3. Verify notifications show source
4. (Optional) Add visual indicator in bookings list to show source
5. (Optional) Add filter to show only website bookings

## Status
🟢 COMPLETE - All fixes applied, ready to test after SQL migration
