@echo off
echo 🚀 QUICK BACKEND STARTUP
echo =======================
echo.

cd /d "%~dp0\backend"

echo 1️⃣ Checking environment...
if not exist .env (
    echo Creating .env from template...
    copy .env.example .env
)

echo.
echo 2️⃣ Starting backend server...
echo.
echo ⚠️  IMPORTANT: This will open the backend in THIS window
echo    The server will keep running - don't close this window!
echo    Open a NEW window for other commands.
echo.

npx tsx src/server.ts
