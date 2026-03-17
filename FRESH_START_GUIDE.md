# Fresh Start Guide - Reset All Data

## What Gets Deleted
- ❌ All bookings
- ❌ All guest profiles
- ❌ All expenses
- ❌ All audit logs
- ❌ All notifications

## What Gets Preserved
- ✅ Rooms & room categories
- ✅ Services & amenities
- ✅ User accounts
- ✅ System settings
- ✅ Website content

---

## Method 1: SQL Script (Recommended - Fastest)

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the contents of `reset-all-data.sql`
6. Click "Run" (or press Ctrl+Enter)
7. Verify the counts show 0 for all transactional tables

**Then clear IndexedDB:**
1. Open your hotel system in the browser
2. Press F12 to open DevTools
3. Go to: Application > Storage > IndexedDB
4. Right-click "MironaHotelDB" > Delete database
5. Refresh the page (Ctrl+R or F5)

✅ Done! Your system is now fresh.

---

## Method 2: Manual Deletion (Slower)

### Clear Supabase:
1. Go to Supabase Dashboard > Table Editor
2. For each table (bookings, guests, expenses, audit_logs, notifications):
   - Click the table name
   - Select all rows (click checkbox in header)
   - Click "Delete" button
   - Confirm deletion

### Clear IndexedDB:
Same as Method 1 above.

---

## Method 3: Guest Directory Only

If you only want to clear guest profiles but keep bookings:

1. Go to Guest Directory in your hotel system
2. Delete guests one by one (or use the SQL script below)
3. Click "Sync from Bookings" button to recreate guest profiles from existing bookings

**SQL to clear guests only:**
```sql
DELETE FROM guests;
```

---

## After Reset

Your system will be completely fresh:
- No bookings
- No guest history
- No financial records
- Clean audit trail

But all your configuration remains:
- Room setup intact
- Services available
- Staff accounts active
- Settings preserved

You can immediately start creating new bookings!

---

## Troubleshooting

**If data still appears after reset:**
1. Make sure you cleared BOTH Supabase AND IndexedDB
2. Do a hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Clear browser cache if needed

**If you get errors:**
- Make sure you're logged in as ADMIN (not RECEPTION)
- Check your internet connection
- Verify Supabase is accessible

---

## Need Help?

If you encounter issues, check the browser console (F12 > Console) for error messages.
