@echo off
echo Installing correct Tailwind CSS PostCSS plugin...
echo.
node node_modules/npm/bin/npm-cli.js install -D @tailwindcss/postcss
if %errorlevel% neq 0 (
    echo Trying alternative method...
    call npm install -D @tailwindcss/postcss
)
echo.
echo Installation complete! Now run build.bat
pause
