@echo off
echo ========================================
echo Fixing Booking Update Error (406)
echo ========================================
echo.

echo Step 1: Checking for duplicate bookings...
node check-duplicate-bookings.js
echo.

echo Step 2: Do you want to fix duplicates? (Y/N)
set /p confirm=
if /i "%confirm%"=="Y" (
    echo.
    echo Fixing duplicates...
    node fix-duplicate-bookings.js
    echo.
    echo ========================================
    echo Done! Try checking in guests again.
    echo ========================================
) else (
    echo.
    echo Skipped duplicate fix.
    echo The code has been updated to handle duplicates gracefully.
)

pause
