@echo off
echo ============================================
echo  Building Mirona Hotel (Offline-Ready)
echo ============================================

echo.
echo [1/2] Building app with Tailwind CSS bundled...
node node_modules/vite/bin/vite.js build

if %errorlevel% neq 0 (
  echo.
  echo BUILD FAILED. Check errors above.
  pause
  exit /b 1
)

echo.
echo [2/2] Build complete! Starting preview server...
echo.
echo ============================================
echo  App is running at: http://localhost:4173
echo  Open this URL in your browser.
echo  The UI will work OFFLINE after first load.
echo ============================================
echo.
node node_modules/vite/bin/vite.js preview --host
