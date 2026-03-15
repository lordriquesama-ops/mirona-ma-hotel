# Quick Guide: Fix Missing Guests

## The Problem
Your guests table shows 0 guests even though you have bookings with guest information.

## The Fix (Choose One)

### Option 1: Automatic (Recommended)
Just **reload your browser** (F5 or Ctrl+R). The system will automatically:
- Scan all bookings in Supabase
- Create guest records for each unique guest
- Calculate visits and spending statistics

This happens once when the app loads.

### Option 2: Manual Script
Run this command in the `websiste` folder:
```bash
node create-guests-from-existing-bookings.js
```

Or double-click:
```
create-guests-now.bat
```

## What to Expect

After the fix runs, you'll see:
- ✅ All guests from your bookings in the Guests tab
- ✅ Correct visit counts for each guest
- ✅ Total spending amounts
- ✅ VIP badges for high-spending guests (>1M UGX)

## Verification

1. Open the admin panel
2. Click on "Guests" tab
3. You should see all your guests listed
4. Each guest shows their booking history and statistics

## Why This Happened

When bookings were initially synced from IndexedDB to Supabase, the guest creation step was skipped. This fix ensures:
- Past bookings now create guest records
- Future bookings will always create/update guests automatically

---

**Need Help?** Check `GUEST_CREATION_FIX_COMPLETE.md` for technical details.
