@echo off
echo Installing Tailwind CSS, PostCSS, and Autoprefixer...
node node_modules/npm/bin/npm-cli.js install -D @tailwindcss/postcss tailwindcss autoprefixer
if %errorlevel% neq 0 (
    echo.
    echo Installation failed. Trying alternative method...
    call npm install -D @tailwindcss/postcss tailwindcss autoprefixer
)
echo.
echo Installation complete!
echo.
echo Next steps:
echo 1. Run build.bat to build the application
echo 2. Run preview.bat to test offline functionality
echo.
pause
