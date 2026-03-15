@echo off
echo 📦 Installing Supabase Client...
cd /d "%~dp0"
call npm install @supabase/supabase-js
echo ✅ Supabase client installed successfully!
pause
