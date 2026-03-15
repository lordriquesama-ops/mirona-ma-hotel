@echo off
echo 🔄 RESTARTING BACKEND SERVER...
echo ==============================

cd /d "%~dp0\backend"

echo Stopping any existing backend processes...
taskkill /f /im node.exe >nul 2>&1

echo.
echo Starting backend server...
npx tsx src/server.ts
