@echo off
echo 🔄 RESTARTING BACKEND...
cd /d "%~dp0\backend"
taskkill /f /im node.exe >nul 2>&1
timeout /t 3 >nul
start "Backend Server" cmd /k "npx tsx src/server.ts"
echo ✅ Backend restarted in new window
