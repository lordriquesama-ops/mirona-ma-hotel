@echo off
echo Generating Tailwind CSS file...
echo.

REM Use node to run tailwindcss directly from node_modules
node node_modules/tailwindcss/lib/cli.js -i ./index.css -o ./public/tailwind-output.css

if %errorlevel% equ 0 (
    echo.
    echo ✓ CSS generated successfully!
    echo File: websiste/public/tailwind-output.css
    echo.
    echo Next: Update index.html to use this file
) else (
    echo.
    echo ✗ CSS generation failed
    echo Try running: npm run build
)

pause
