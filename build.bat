@echo off
echo Building application...
node node_modules/vite/bin/vite.js build
if %errorlevel% neq 0 (
  echo BUILD FAILED.
  pause
  exit /b 1
)
echo Copying service worker to dist...
copy service-worker.js dist\service-worker.js /y
echo.
echo ============================================
echo  Build complete!
echo  Run build-and-serve.bat to start the app.
echo  Or open dist/index.html directly.
echo ============================================
pause
