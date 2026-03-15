@echo off
echo 🚨 EMERGENCY SYSTEM FIX
echo ========================
echo.

echo 1️⃣ Checking backend directory...
cd /d "%~dp0\backend"

echo.
echo 2️⃣ Creating .env file if missing...
if not exist .env (
    copy .env.example .env
    echo ✅ .env file created
) else (
    echo ✅ .env file exists
)

echo.
echo 3️⃣ Installing dependencies if needed...
call npm install --silent

echo.
echo 4️⃣ Starting backend server...
echo This will open in a NEW window - DO NOT CLOSE IT!
start "Mirona Backend Server" cmd /k "npx tsx src/server.ts"

echo.
echo 5️⃣ Waiting for server to start...
timeout /t 8 /nobreak >nul

echo.
echo 6️⃣ Testing server connection...
cd /d "%~dp0"
node simple-test.js

echo.
echo 🎯 If the test above shows "Backend is running", then:
echo    ✅ Backend is working!
echo    ✅ Now run: node qa-audit.js
echo.
echo If not, check the backend window for errors...
pause
