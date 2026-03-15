# PowerShell script to start frontend development server
Write-Host "🚀 Starting Frontend Development Server..."

# Set working directory
Set-Location $PSScriptRoot

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies first..."
    npm install
}

# Start development server with explicit environment loading
Write-Host "🔄 Starting Vite development server..."
$env:VITE_SUPABASE_URL="https://wyelzqqqmrkwqtduqamf.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWx6cXFxbXJrd3F0ZHVxYW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTgwMzgsImV4cCI6MjA4ODYzNDAzOH0.syKfjzt3_WpPE7KXeJqUM8B5oV5k86A1x2fLybDUjtA"
$env:VITE_USE_SUPABASE="true"
npm run dev
