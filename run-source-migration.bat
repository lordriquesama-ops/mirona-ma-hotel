@echo off
echo ========================================
echo Add Source Column to Bookings Table
echo ========================================
echo.
echo This will add a 'source' column to track where bookings come from:
echo - admin (dashboard)
echo - website (public site)
echo - phone (phone booking)
echo - walkin (walk-in guest)
echo.
echo INSTRUCTIONS:
echo 1. Open Supabase Dashboard: https://supabase.com/dashboard
echo 2. Go to your project: wyelzqqqmrkwqtduqamf
echo 3. Click "SQL Editor" in the left sidebar
echo 4. Click "New Query"
echo 5. Copy and paste the SQL below:
echo.
echo ----------------------------------------
type add-booking-source.sql
echo ----------------------------------------
echo.
echo 6. Click "Run" button
echo 7. You should see "Success. No rows returned"
echo.
echo After running the SQL, website bookings will work!
echo.
pause
