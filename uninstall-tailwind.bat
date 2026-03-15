@echo off
echo Uninstalling Tailwind CSS and PostCSS packages...
node node_modules/npm/bin/npm-cli.js uninstall tailwindcss @tailwindcss/postcss postcss autoprefixer
if %errorlevel% neq 0 (
    echo Trying alternative method...
    call npm uninstall tailwindcss @tailwindcss/postcss postcss autoprefixer
)
echo.
echo Uninstall complete!
echo System restored to CDN Tailwind.
pause
