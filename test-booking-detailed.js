// Test booking creation with detailed error capture
async function testBookingDetailed() {
  console.log('🔍 DETAILED BOOKING TEST');
  console.log('========================\n');

  try {
    // Step 1: Login
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    const { token } = await loginResponse.json();
    console.log('✅ Authentication successful');

    // Step 2: Get a room
    const roomsResponse = await fetch('http://localhost:3001/api/rooms', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const rooms = await roomsResponse.json();
    const testRoom = rooms.find(r => r.status === 'Available');
    
    if (!testRoom) {
      console.log('❌ No available rooms');
      return;
    }

    console.log(`📊 Using room: ${testRoom.name} (Price: ${testRoom.price})`);

    // Step 3: Create minimal booking data
    const minimalBooking = {
      guestName: 'Test Guest',
      phone: '+256700000999',
      roomId: testRoom.id,
      roomName: testRoom.name,
      roomPrice: testRoom.price,
      checkInDate: new Date().toISOString(),
      checkOutDate: new Date(Date.now() + 86400000).toISOString(),
      adults: 2,
      amount: testRoom.price,
      paidAmount: 0,
      paymentMethod: 'Cash',
      status: 'CONFIRMED'
    };

    console.log('\n📋 Sending minimal booking data...');

    // Step 4: Create booking with detailed error capture
    const createResponse = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(minimalBooking)
    });

    console.log(`📊 Response status: ${createResponse.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(createResponse.headers.entries()));

    const responseText = await createResponse.text();
    console.log(`📊 Response body:`, responseText);

    if (createResponse.ok) {
      console.log('✅ SUCCESS! Booking created');
    } else {
      console.log('❌ Booking creation failed');
      
      // Try to parse error
      try {
        const errorData = JSON.parse(responseText);
        console.log('🔍 Error details:', errorData);
      } catch (e) {
        console.log('🔍 Raw error response:', responseText);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBookingDetailed();
