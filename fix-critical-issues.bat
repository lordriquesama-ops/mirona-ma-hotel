@echo off
echo 🔧 FIXING CRITICAL SYSTEM ISSUES...
echo.

echo 1️⃣ Setting up database...
cd /d "%~dp0\backend"
call setup-database.bat

echo.
echo 2️⃣ Starting backend server...
echo Starting server in new window...
start "Mirona Backend" cmd /k "npx tsx src/server.ts"

echo.
echo 3️⃣ Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo 4️⃣ Testing connection...
cd /d "%~dp0"
call node simple-test.js

echo.
echo ✅ Critical issues should now be fixed!
echo 🧪 Run the full QA audit: node qa-audit.js
pause
