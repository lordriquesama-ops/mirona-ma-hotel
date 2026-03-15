@echo off
echo 🧪 TESTING BOOKING CREATION FIX...
echo ==================================

cd /d "%~dp0"

echo Testing booking creation with roomPrice...
node -e "
const fetch = require('node-fetch');
(async () => {
  try {
    console.log('1️⃣ Getting authentication token...');
    const login = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username: 'admin', password: 'password123'})
    });
    const {token} = await login.json();
    console.log('✅ Authentication successful');

    console.log('\\n2️⃣ Creating test booking...');
    const booking = {
      guestName: 'Test Guest',
      phone: '+256700000999',
      roomId: 'A1',
      roomName: 'A1',
      roomPrice: 50000,
      checkInDate: new Date().toISOString(),
      checkOutDate: new Date(Date.now() + 86400000).toISOString(),
      adults: 2,
      children: 0,
      guests: 1,
      amount: 50000,
      paidAmount: 0,
      paymentMethod: 'Cash',
      status: 'CONFIRMED'
    };
    
    const create = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(booking)
    });
    
    console.log('📊 Booking creation status:', create.status);
    if(create.ok) {
      console.log('✅ SUCCESS! Booking creation working!');
      const result = await create.json();
      console.log('   Created booking ID:', result.id);
      console.log('   Guest:', result.guestName);
      console.log('   Room:', result.roomName);
      console.log('   Price:', result.roomPrice);
      
      // Clean up
      await fetch('http://localhost:3001/api/bookings/' + result.id, {
        method: 'DELETE',
        headers: {'Authorization': 'Bearer ' + token}
      });
      console.log('🧹 Test booking cleaned up');
    } else {
      console.log('❌ FAILED - Booking creation still broken');
      const error = await create.text();
      console.log('   Error:', error);
    }
  } catch(e) { 
    console.log('❌ Error:', e.message); 
  }
})();
"

echo.
echo 🎯 Now run the full QA audit:
echo    node qa-audit.js
pause
