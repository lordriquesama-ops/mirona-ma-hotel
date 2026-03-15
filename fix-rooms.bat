@echo off
echo 🔧 FIXING ROOM CREATION...
echo ========================

cd /d "%~dp0\backend"

echo Running fixed room seed...
npx tsx src/db/seed.ts

echo.
echo Verifying rooms were created...
cd /d "%~dp0"
node prove-data-location.js

echo.
echo ✅ Rooms should now be created successfully!
pause
