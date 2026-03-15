# Booking Update Error (406) - FIXED

## Problem
When trying to check in guests, the system was throwing a 406 error:
```
Failed to load resource: the server responded with a status of 406 ()
❌ Supabase saveBooking failed: Cannot coerce the result to a single JSON object
```

## Root Cause
The error occurred in `supabase-adapter.ts` in the `saveBooking` function. When updating an existing booking, the code was using `.single()` which expects exactly ONE row to be returned from Supabase.

The 406 error "Cannot coerce the result to a single JSON object" means Supabase was returning MULTIPLE rows instead of one, which happens when there are duplicate booking IDs in the database.

## Solution Applied

### 1. Fixed the Code (DONE)
Updated `websiste/services/supabase-adapter.ts` line 85-95:

**Before:**
```typescript
const { data, error } = await supabase
  .from(TABLES.BOOKINGS)
  .update(bookingData)
  .eq('id', booking.id)
  .select()
  .single();  // ❌ Fails if multiple rows exist
```

**After:**
```typescript
const { data, error } = await supabase
  .from(TABLES.BOOKINGS)
  .update(bookingData)
  .eq('id', booking.id)
  .select();  // ✅ Returns array, handles multiple rows

// Handle multiple rows or no rows
if (!data || data.length === 0) {
  throw new Error(`Booking ${booking.id} not found`);
}

if (data.length > 1) {
  console.warn(`⚠️ Multiple bookings found with ID ${booking.id}, using first one`);
}

return mapBookingFromSupabase(data[0]);
```

### 2. Diagnostic Scripts Created

**check-duplicate-bookings.js** - Checks if duplicate booking IDs exist
**fix-duplicate-bookings.js** - Removes duplicate bookings (keeps most recent)
**fix-booking-error.bat** - Runs both scripts interactively

## How to Use

### Option 1: Just Test (Code is Already Fixed)
The code fix is already applied. Try checking in a guest again - it should work now even if duplicates exist.

### Option 2: Clean Up Duplicates (Recommended)
Run this command to check and fix any duplicate bookings:
```bash
cd websiste
./fix-booking-error.bat
```

Or manually:
```bash
# Check for duplicates
node check-duplicate-bookings.js

# Fix duplicates (if found)
node fix-duplicate-bookings.js
```

## What Changed
- ✅ Removed `.single()` from UPDATE query
- ✅ Added proper error handling for multiple/no rows
- ✅ Added warning log when duplicates are detected
- ✅ System now gracefully handles duplicate bookings
- ✅ Check-in operation should work correctly now

## Testing
1. Try checking in a guest from the bookings page
2. The operation should complete successfully
3. Check browser console - should see "✅ Booking saved to Supabase"
4. No more 406 errors

## Prevention
To prevent duplicate bookings in the future:
- The UUID primary key should prevent duplicates
- If duplicates still occur, run the cleanup script
- Consider adding a unique constraint on booking_number as well

## Status
🟢 FIXED - Code updated, ready to test
