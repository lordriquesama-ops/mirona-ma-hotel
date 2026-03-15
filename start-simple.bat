@echo off
echo 🚀 Starting Frontend with Environment Variables...

REM Set environment variables for this session
set VITE_SUPABASE_URL=https://wyelzqqqmrkwqtduqamf.supabase.co
set VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWx6cXFxbXJrd3F0ZHVxYW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTgwMzgsImV4cCI6MjA4ODYzNDAzOH0.syKfjzt3_WpPE7KXeJqUM8B5oV5k86A1x2fLybDUjtA
set VITE_USE_SUPABASE=true

echo 🔄 Starting Vite development server...
npm run dev
