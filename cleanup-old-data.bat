@echo off
echo ========================================
echo  CLEANUP OLD DATA - Keep March 12 Only
echo ========================================
echo.
echo This will DELETE all data NOT from March 12, 2026
echo.
pause
echo.
echo Running cleanup script...
node cleanup-old-data.js
echo.
pause
