@echo off
echo ========================================
echo   COMPLETE DATA RESET TOOL
echo ========================================
echo.
echo WARNING: This will delete ALL bookings,
echo guests, expenses, and audit logs!
echo.
echo Rooms, categories, services, users, and
echo settings will be preserved.
echo.
pause

node reset-all-data.js

echo.
echo ========================================
echo   NEXT STEPS
echo ========================================
echo.
echo 1. Open your browser
echo 2. Press F12 to open DevTools
echo 3. Go to: Application ^> Storage ^> IndexedDB
echo 4. Right-click "MironaHotelDB" ^> Delete database
echo 5. Refresh the page (Ctrl+R)
echo.
echo Your system is now fresh and ready!
echo.
pause
