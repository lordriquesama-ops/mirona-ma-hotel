@echo off
echo Checking .env file...

cd /d "%~dp0\backend"

if exist .env (
    echo ✅ .env file exists
    echo Contents:
    type .env
) else (
    echo ❌ .env file does not exist
    echo Creating from .env.example...
    copy .env.example .env
    echo ✅ .env file created
)

echo.
pause
