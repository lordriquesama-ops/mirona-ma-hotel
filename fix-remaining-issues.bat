@echo off
echo 🔧 FIXING REMAINING CRITICAL ISSUES...
echo =====================================
echo.

cd /d "%~dp0\backend"

echo 1️⃣ Checking why rooms are missing...
echo Running database seed to create rooms...
call npx tsx src/db/seed.ts

echo.
echo 2️⃣ Testing rooms creation...
cd /d "%~dp0"
node -e "
const fetch = require('node-fetch');
(async () => {
  try {
    const login = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username: 'admin', password: 'password123'})
    });
    const {token} = await login.json();
    const rooms = await fetch('http://localhost:3001/api/rooms', {
      headers: {'Authorization': 'Bearer ' + token}
    });
    const data = await rooms.json();
    console.log('📊 Rooms in database:', data.length);
    if(data.length > 0) console.log('✅ Rooms created successfully!');
    else console.log('❌ Rooms still missing');
  } catch(e) { console.log('❌ Error:', e.message); }
})();
"

echo.
echo 3️⃣ Checking Settings endpoint...
node -e "
const fetch = require('node-fetch');
(async () => {
  try {
    const login = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username: 'admin', password: 'password123'})
    });
    const {token} = await login.json();
    const settings = await fetch('http://localhost:3001/api/settings', {
      headers: {'Authorization': 'Bearer ' + token}
    });
    console.log('📊 Settings endpoint status:', settings.status);
    if(settings.ok) console.log('✅ Settings endpoint working!');
    else console.log('❌ Settings endpoint failed');
  } catch(e) { console.log('❌ Error:', e.message); }
})();
"

echo.
echo 4️⃣ Testing booking creation...
node -e "
const fetch = require('node-fetch');
(async () => {
  try {
    const login = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username: 'admin', password: 'password123'})
    });
    const {token} = await login.json();
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
      console.log('✅ Booking creation working!');
      const result = await create.json();
      console.log('   Created booking ID:', result.id);
    } else {
      console.log('❌ Booking creation failed');
      const error = await create.text();
      console.log('   Error:', error);
    }
  } catch(e) { console.log('❌ Error:', e.message); }
})();
"

echo.
echo ✅ Issue diagnosis completed!
echo 🧪 Run final audit: node qa-audit.js
pause
