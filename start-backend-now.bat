@echo off
echo Starting Mirona Hotel Backend Server...

cd /d "%~dp0\backend"

echo Checking environment...
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
)

echo Starting server on http://localhost:3001
echo Press Ctrl+C to stop the server
echo.

npx tsx src/server.ts
