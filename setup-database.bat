@echo off
echo Setting up Mirona Hotel Database...

cd /d "%~dp0\backend"

echo.
echo 1️⃣ Checking .env file...
if not exist .env (
    echo Creating .env from template...
    copy .env.example .env
) else (
    echo .env file exists
)

echo.
echo 2️⃣ Checking Prisma installation...
call npm list @prisma/client >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Prisma...
    call npm install @prisma/client prisma
)

echo.
echo 3️⃣ Generating Prisma client...
call npx prisma generate

echo.
echo 4️⃣ Running database migration...
call npx prisma migrate dev --name init

echo.
echo 5️⃣ Seeding database with default data...
call npx tsx src/db/seed.ts

echo.
echo ✅ Database setup completed!
echo.
echo You can now test with: node ..\simple-test.js
pause
