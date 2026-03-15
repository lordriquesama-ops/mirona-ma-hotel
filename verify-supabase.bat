@echo off
echo ========================================
echo Supabase Connection Verification
echo ========================================
echo.

echo [1/3] Checking environment variables...
if exist .env (
    echo ✓ .env file found
    findstr /C:"VITE_SUPABASE_URL" .env >nul
    if %errorlevel% equ 0 (
        echo ✓ VITE_SUPABASE_URL configured
    ) else (
        echo ✗ VITE_SUPABASE_URL missing
    )
    
    findstr /C:"VITE_SUPABASE_ANON_KEY" .env >nul
    if %errorlevel% equ 0 (
        echo ✓ VITE_SUPABASE_ANON_KEY configured
    ) else (
        echo ✗ VITE_SUPABASE_ANON_KEY missing
    )
    
    findstr /C:"VITE_USE_SUPABASE=true" .env >nul
    if %errorlevel% equ 0 (
        echo ✓ VITE_USE_SUPABASE enabled
    ) else (
        echo ✗ VITE_USE_SUPABASE not enabled
    )
) else (
    echo ✗ .env file not found
)
echo.

echo [2/3] Checking Supabase package...
if exist node_modules\@supabase\supabase-js (
    echo ✓ @supabase/supabase-js installed
) else (
    echo ✗ @supabase/supabase-js not installed
    echo   Run: npm install
)
echo.

echo [3/3] Checking configuration files...
if exist services\supabase.ts (
    echo ✓ services/supabase.ts found
) else (
    echo ✗ services/supabase.ts missing
)

if exist services\supabase-adapter.ts (
    echo ✓ services/supabase-adapter.ts found
) else (
    echo ✗ services/supabase-adapter.ts missing
)

if exist services\db.ts (
    echo ✓ services/db.ts found
) else (
    echo ✗ services/db.ts missing
)
echo.

echo ========================================
echo Running connection test...
echo ========================================
node test-supabase-connection.js

echo.
echo ========================================
echo Verification complete!
echo ========================================
pause
