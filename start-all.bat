@echo off
echo ========================================
echo   Starting Mirona Hotel Management System
echo ========================================
echo.

:: Check if backend is running
echo Checking if backend is running...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is already running
    goto start_frontend
)

echo Starting backend server...
cd /d "%~dp0\backend"

:: Check if .env exists
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
)

:: Start backend in new window
start "Mirona Backend" cmd /k "npx tsx src/server.ts"

:: Wait for backend to start
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

:: Check if backend started successfully
:check_backend
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Waiting for backend...
    timeout /t 2 /nobreak >nul
    goto check_backend
)

echo ✅ Backend started successfully!

:start_frontend
echo.
echo Starting frontend...
cd /d "%~dp0"

:: Start frontend in new window
start "Mirona Frontend" cmd /k "npm run dev"

:: Wait for frontend to start
echo Waiting for frontend to start...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   🎉 System Started Successfully!
echo ========================================
echo.
echo 📍 Frontend: http://localhost:5173
echo 📍 Backend:  http://localhost:3001
echo.
echo Default Login Credentials:
echo   Admin:     admin / password123
echo   Manager:   manager / password123
echo   Reception: reception / password123
echo   Marketing: marketing / password123
echo.
echo Press any key to exit this window...
pause >nul
