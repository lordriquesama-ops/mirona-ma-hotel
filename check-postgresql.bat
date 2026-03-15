@echo off
echo Checking PostgreSQL Status...

echo.
echo 1. Checking if PostgreSQL is running...
net start | findstr "postgresql"
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL service is running
) else (
    echo ❌ PostgreSQL service is NOT running
    echo Please start PostgreSQL service first
    goto end
)

echo.
echo 2. Testing database connection...
cd /d "%~dp0\backend"

:: Create a simple connection test
echo import prisma from './src/db/index.js'; > test-connection.js
echo try { >> test-connection.js
echo   await prisma.$connect(); >> test-connection.js
echo   console.log('✅ Connected to PostgreSQL successfully!'); >> test-connection.js
echo   const result = await prisma.$queryRaw`SELECT current_database();`; >> test-connection.js
echo   console.log('📊 Current database:', result[0].current_database); >> test-connection.js
echo   const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`; >> test-connection.js
echo   console.log('📋 Tables:', tables.map(t => t.table_name).join(', ')); >> test-connection.js
echo   await prisma.$disconnect(); >> test-connection.js
echo } catch (error) { >> test-connection.js
echo   console.error('❌ Connection failed:', error.message); >> test-connection.js
echo } >> test-connection.js

echo Testing connection...
npx tsx test-connection.js
del test-connection.js

:end
echo.
pause
