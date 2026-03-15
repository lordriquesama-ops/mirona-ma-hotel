# Fix "Could not find 'source' column" Error

## Error Message
```
Could not find the 'source' column of 'bookings' in the schema cache
```

## What Happened
The code is trying to save a `source` field to track where bookings come from (website vs admin), but the database column doesn't exist yet.

## Quick Fix - Run This SQL

### Option 1: Copy/Paste in Supabase Dashboard

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `wyelzqqqmrkwqtduqamf`
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy and paste this SQL:

```sql
-- Add source column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin' 
CHECK (source IN ('admin', 'website', 'phone', 'walkin'));

-- Add comment
COMMENT ON COLUMN bookings.source IS 'Source of the booking: admin (dashboard), website (public site), phone (phone booking), walkin (walk-in guest)';

-- Update existing bookings to have 'admin' as source
UPDATE bookings SET source = 'admin' WHERE source IS NULL;
```

6. Click **Run** button
7. Should see: "Success. No rows returned"

### Option 2: Use the SQL File

The SQL is already in the file: `websiste/add-booking-source.sql`

Just copy its contents and paste into Supabase SQL Editor.

## After Running the SQL

1. Try making a booking from the website again
2. Should work without errors
3. Website bookings will show "(from Website)" in notifications
4. You can track which bookings came from the website vs admin dashboard

## What the Source Field Does

- **admin** - Booking created from admin dashboard
- **website** - Booking created from public website
- **phone** - Booking taken over the phone (future use)
- **walkin** - Walk-in guest booking (future use)

## Verification

After running the SQL, check in Supabase:
1. Go to **Table Editor**
2. Select **bookings** table
3. You should see a new column called **source**
4. All existing bookings should have `source = 'admin'`

## Status
⚠️ WAITING FOR SQL MIGRATION - Run the SQL above to fix the error
