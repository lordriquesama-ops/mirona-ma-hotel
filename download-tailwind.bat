@echo off
echo Downloading Tailwind CSS standalone build for offline use...
echo.
if not exist "public" mkdir public

echo Downloading Tailwind CSS v3.4.1 standalone...
curl -L -o public/tailwind.min.js https://cdn.jsdelivr.net/npm/tailwindcss@3.4.1/dist/tailwind.min.js

if %errorlevel% neq 0 (
    echo Failed to download with curl. Trying with PowerShell...
    powershell -Command "Invoke-WebRequest -Uri 'https://cdn.jsdelivr.net/npm/tailwindcss@3.4.1/dist/tailwind.min.js' -OutFile 'public/tailwind.min.js'"
)

echo.
if exist "public/tailwind.min.js" (
    echo ✓ Download complete! Tailwind CSS saved to public/tailwind.min.js
    echo File size:
    dir public\tailwind.min.js | find "tailwind"
) else (
    echo ✗ Download failed. Please check your internet connection.
)
echo.
pause
