# 🚨 Quick Fix: Guests Not Showing

## The Problem

Your Guests Directory shows 0 guests even though you have bookings. This is because:

1. **Migration not run**: Supabase still expects UUID for guest IDs
2. **Guests not created**: When you save bookings, guest creation fails silently

---

## ✅ Quick Fix (3 Steps)

### Step 1: Run Migration (2 minutes)

1. Open Supabase Dashboard: https://wyelzqqqmrkwqtduqamf.supabase.co
2. Click "SQL Editor" → "New Query"
3. Copy ALL of `PRODUCTION_SAFE_MIGRATION.sql`
4. Paste and click "Run"
5. Wait for success message

### Step 2: Restart Dev Server (30 seconds)

```bash
# In terminal, stop server (Ctrl+C)
npm run dev
```

### Step 3: Sync Guests (1 minute)

**Option A: Use the Sync Button (Easiest)**
1. Open your app
2. Go to Guests Directory
3. Click "SYNC DATA - From Bookings" button
4. Wait for "Sync complete!" message

**Option B: Run Script in Console**
1. Open your app
2. Press F12 (console)
3. Copy and paste this:

```javascript
(async () => {
    const { getBookings, upsertGuestFromBooking } = await import('./services/db.js');
    const bookings = await getBookings();
    console.log(`Processing ${bookings.length} bookings...`);
    for (const booking of bookings) {
        await upsertGuestFromBooking(booking);
    }
    console.log('✅ Done! Refresh page (F5)');
})();
```

4. Press Enter
5. Wait for "Done!" message
6. Refresh page (F5)

---

## 🔍 Check If It Worked

### In Your App
1. Go to Guests Directory
2. Should show guests now
3. Stats should be accurate

### In Supabase
1. Open Supabase Dashboard
2. Go to Table Editor
3. Click `guests` table
4. Should see guest records

### In Console (F12)
Look for these messages:
```
👤 Creating/updating guest profile for: John Doe
   Visits: 1, Total Spent: 50000
   Creating new guest profile
   Guest ID: 082332323
✅ Guest upserted to Supabase: 082332323
```

---

## 🚨 If Still Not Working

### Check Console for Errors

Open console (F12) and look for:

**UUID Error**:
```
❌ Supabase upsertGuest error: Invalid UUID format
```
→ Run PRODUCTION_SAFE_MIGRATION.sql

**Permission Error**:
```
❌ Permission denied for table guests
```
→ Check RLS policies in Supabase

**Network Error**:
```
❌ Failed to fetch
```
→ Check internet connection

---

## 📋 Diagnostic Checklist

Run through this checklist:

- [ ] PRODUCTION_SAFE_MIGRATION.sql has been run
- [ ] Dev server restarted
- [ ] USE_SUPABASE is true in config
- [ ] Internet connection working
- [ ] No errors in console
- [ ] Bookings exist in database
- [ ] Bookings have guest names

---

## 🎯 Expected Result

After following these steps:

**Guests Directory should show**:
- Total Guests: X (number of unique guests)
- VIP Members: Y (guests who spent > 1M)
- In-House: Z (currently checked-in guests)
- List of all guests with their stats

**Each guest should have**:
- Name
- Contact info (phone/email)
- Number of visits
- Total spent
- Last visit date
- VIP badge (if applicable)

---

## 💡 Why This Happens

The guest creation process:
```
1. User creates booking
   ↓
2. Booking saved to Supabase ✅
   ↓
3. upsertGuestFromBooking() called
   ↓
4. Try to save guest to Supabase
   ↓
5. If UUID error → Fails silently ❌
   ↓
6. Guest not created
```

After migration:
```
1. User creates booking
   ↓
2. Booking saved to Supabase ✅
   ↓
3. upsertGuestFromBooking() called
   ↓
4. Save guest to Supabase ✅
   ↓
5. Guest created successfully ✅
```

---

## 🔧 Manual Fix (If Sync Button Doesn't Work)

If the sync button doesn't work, manually create guests:

1. Open Supabase Dashboard
2. Go to Table Editor
3. Click `guests` table
4. Click "Insert row"
5. Fill in:
   - id: Phone number or "g-123456"
   - name: Guest name
   - phone: Phone number
   - email: Email (optional)
   - visits: 1
   - total_spent: 0
   - is_vip: false
6. Click "Save"

---

## ✅ Success Indicators

You'll know it's fixed when:
- ✅ Guests Directory shows guests
- ✅ Stats are accurate (visits, spent)
- ✅ Console shows "Guest upserted to Supabase"
- ✅ Supabase `guests` table has data
- ✅ New bookings auto-create guests

---

## 📞 Still Stuck?

Run the diagnostic script:

1. Open console (F12)
2. Copy `diagnose-guest-creation.js`
3. Paste and press Enter
4. Read the diagnosis
5. Follow the suggested fixes

---

**Time to Fix**: 3-5 minutes
**Difficulty**: Easy
**Result**: Guests showing in directory! 🎉
