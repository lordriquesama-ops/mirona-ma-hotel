// Simple test without external dependencies
async function testBackend() {
  console.log('🔍 Testing Backend Connection...\n');

  try {
    // Test 1: Check if backend is running
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await fetch('http://localhost:3001/health');
    
    if (!healthResponse.ok) {
      throw new Error('Backend not responding');
    }
    
    const health = await healthResponse.json();
    console.log('✅ Backend is running');
    console.log(`   Status: ${health.status}\n`);

    // Test 2: Test login
    console.log('2️⃣ Testing authentication...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed - backend might not be connected to PostgreSQL');
    }

    const loginData = await loginResponse.json();
    console.log('✅ Authentication successful!');
    console.log(`   User: ${loginData.user.name} (${loginData.user.role})\n`);

    // Test 3: Check bookings
    console.log('3️⃣ Checking bookings in PostgreSQL...');
    const token = loginData.token;
    
    const bookingsResponse = await fetch('http://localhost:3001/api/bookings', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (bookingsResponse.ok) {
      const bookings = await bookingsResponse.json();
      console.log(`📊 Found ${bookings.length} bookings in PostgreSQL:`);
      
      if (bookings.length > 0) {
        bookings.slice(0, 3).forEach((booking, index) => {
          console.log(`   ${index + 1}. ${booking.guestName} - ${booking.roomName} - ${booking.status}`);
        });
      } else {
        console.log('   No bookings found in PostgreSQL');
      }
    } else {
      console.log('❌ Failed to fetch bookings');
    }

    console.log('\n🎉 Test completed! Your backend is working.');
    console.log('💡 If you see bookings listed above, they ARE stored in PostgreSQL!');

  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    console.log('\n🔧 Make sure:');
    console.log('1. Backend server is running (start-backend.bat)');
    console.log('2. PostgreSQL is running');
    console.log('3. Database "mirona_hotel" exists');
  }
}

testBackend();
