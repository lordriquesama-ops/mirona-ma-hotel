@echo off
echo Setting up offline CSS for Tailwind...
echo.
echo This will:
echo 1. Install Tailwind CSS locally
echo 2. Generate a static CSS file
echo 3. Update HTML to use the static file
echo.

REM Install Tailwind CSS and dependencies
echo Installing Tailwind CSS...
call npm install -D tailwindcss postcss autoprefixer

REM Initialize Tailwind config if it doesn't exist
if not exist "tailwind.config.js" (
    echo Creating tailwind.config.js...
    call npx tailwindcss init -p
)

REM Generate the CSS file
echo Generating static CSS file...
call npx tailwindcss -i ./index.css -o ./public/tailwind-output.css

echo.
echo ✓ Setup complete!
echo.
echo Next steps:
echo 1. Update index.html to use: ^<link rel="stylesheet" href="/tailwind-output.css"^>
echo 2. Run: npm run build
echo 3. Test offline functionality
echo.
pause
