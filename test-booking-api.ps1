# Test booking API with PowerShell
Write-Host "🔍 Testing Booking API..." -ForegroundColor Cyan

try {
    # Step 1: Login to get token
    Write-Host "1️⃣ Getting authentication token..." -ForegroundColor Yellow
    $loginBody = @{
        username = "admin"
        password = "password123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    
    Write-Host "✅ Authentication successful!" -ForegroundColor Green
    Write-Host "   User: $($loginResponse.user.name)" -ForegroundColor White
    
    # Step 2: Check existing bookings
    Write-Host "`n2️⃣ Checking existing bookings..." -ForegroundColor Yellow
    $bookingsResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/bookings" -Method GET -Headers @{
        "Authorization" = "Bearer $token"
    }
    
    Write-Host "📊 Found $($bookingsResponse.Count) bookings in PostgreSQL:" -ForegroundColor Cyan
    if ($bookingsResponse.Count -gt 0) {
        for ($i = 0; $i -lt [Math]::Min(5, $bookingsResponse.Count); $i++) {
            $booking = $bookingsResponse[$i]
            Write-Host "   $($i + 1). $($booking.guestName) - $($booking.roomName) - $($booking.status)" -ForegroundColor White
        }
    } else {
        Write-Host "   No bookings found" -ForegroundColor Gray
    }
    
    # Step 3: Create a test booking
    Write-Host "`n3️⃣ Creating a test booking..." -ForegroundColor Yellow
    $testBooking = @{
        guestName = "Test Guest"
        phone = "+256700000999"
        email = "test@example.com"
        roomId = "A1"
        roomName = "A1"
        roomPrice = 50000
        checkInDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        checkOutDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        adults = 2
        children = 0
        guests = 1
        amount = 50000
        paidAmount = 0
        paymentMethod = "Cash"
        status = "CONFIRMED"
        notes = "Test booking created via PowerShell"
    } | ConvertTo-Json
    
    $createResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/bookings" -Method POST -Body $testBooking -ContentType "application/json" -Headers @{
        "Authorization" = "Bearer $token"
    }
    
    Write-Host "✅ Test booking created successfully!" -ForegroundColor Green
    Write-Host "   ID: $($createResponse.id)" -ForegroundColor White
    Write-Host "   Guest: $($createResponse.guestName)" -ForegroundColor White
    Write-Host "   Room: $($createResponse.roomName)" -ForegroundColor White
    Write-Host "   Status: $($createResponse.status)" -ForegroundColor White
    
    # Step 4: Verify booking was saved
    Write-Host "`n4️⃣ Verifying booking was saved to PostgreSQL..." -ForegroundColor Yellow
    Start-Sleep -Seconds 1
    
    $finalBookings = Invoke-RestMethod -Uri "http://localhost:3001/api/bookings" -Method GET -Headers @{
        "Authorization" = "Bearer $token"
    }
    
    Write-Host "📊 Total bookings in PostgreSQL: $($finalBookings.Count)" -ForegroundColor Cyan
    
    $testBookingFound = $finalBookings | Where-Object { $_.guestName -eq "Test Guest" }
    if ($testBookingFound) {
        Write-Host "✅ Test booking found in PostgreSQL!" -ForegroundColor Green
        Write-Host "   Created at: $($testBookingFound.createdAt)" -ForegroundColor White
        Write-Host "`n🎉 SUCCESS! Bookings ARE being saved to PostgreSQL!" -ForegroundColor Green
    } else {
        Write-Host "❌ Test booking NOT found in PostgreSQL" -ForegroundColor Red
    }
    
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure backend server is running on port 3001" -ForegroundColor White
    Write-Host "2. Check PostgreSQL is running and database exists" -ForegroundColor White
    Write-Host "3. Verify .env file has correct DATABASE_URL" -ForegroundColor White
}

Write-Host "`nPress any key to continue..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
