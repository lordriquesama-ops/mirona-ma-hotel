@echo off
echo ========================================
echo Fix Room Mismatch (A56 Issue)
echo ========================================
echo.
echo Problem: Room A56 exists in browser cache but not in Supabase
echo.
echo Step 1: Sync correct rooms to Supabase
echo ----------------------------------------
node sync-rooms-to-supabase.js
echo.
echo Step 2: Clear browser cache
echo ----------------------------------------
echo.
echo IMPORTANT: You need to clear IndexedDB in your browser
echo.
echo Instructions:
echo 1. Open your app in the browser
echo 2. Press F12 to open DevTools
echo 3. Go to Console tab
echo 4. Paste this code and press Enter:
echo.
echo    indexedDB.deleteDatabase('MironaDB');
echo.
echo 5. Refresh the page (F5)
echo.
echo After this, the website will only show valid rooms from Supabase.
echo.
pause
