// Test the complete sync process
async function testSyncProcess() {
  console.log('🔄 TESTING SYNC PROCESS');
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

    // Step 2: Test guest creation (sync endpoint)
    console.log('\n👤 Testing guest creation...');
    const guestData = {
      name: 'Sync Test Guest',
      phone: '+256700001234',
      email: 'sync@test.com',
      visits: 1,
      totalSpent: 0
    };

    const guestResponse = await fetch('http://localhost:3001/api/guests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(guestData)
    });

    console.log(`📊 Guest creation status: ${guestResponse.status}`);
    
    if (guestResponse.ok) {
      const guest = await guestResponse.json();
      console.log('✅ Guest created successfully:');
      console.log(`   Name: ${guest.name}`);
      console.log(`   Phone: ${guest.phone}`);
      console.log(`   ID: ${guest.id}`);
    } else {
      console.log('❌ Guest creation failed');
      const error = await guestResponse.text();
      console.log('Error:', error);
    }

    // Step 3: Test booking creation with guest
    console.log('\n📋 Testing booking creation...');
    
    // Get a room
    const roomsResponse = await fetch('http://localhost:3001/api/rooms', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const rooms = await roomsResponse.json();
    const testRoom = rooms.find(r => r.status === 'Available');

    if (testRoom) {
      const bookingData = {
        guestName: 'Sync Test Guest',
        phone: '+256700001234',
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

      const bookingResponse = await fetch('http://localhost:3001/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
      });

      console.log(`📊 Booking creation status: ${bookingResponse.status}`);
      
      if (bookingResponse.ok) {
        const booking = await bookingResponse.json();
        console.log('✅ Booking created successfully:');
        console.log(`   ID: ${booking.id}`);
        console.log(`   Guest: ${booking.guestName}`);
        console.log(`   Room: ${booking.roomName}`);
        console.log('🎉 SYNC PROCESS WORKING!');
        
        // Clean up
        await fetch(`http://localhost:3001/api/bookings/${booking.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        await fetch(`http://localhost:3001/api/guests/${guestData.phone}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('🧹 Test data cleaned up');
        
      } else {
        console.log('❌ Booking creation failed');
        const error = await bookingResponse.text();
        console.log('Error:', error);
      }
    } else {
      console.log('❌ No available rooms found');
    }

  } catch (error) {
    console.error('❌ Sync test failed:', error.message);
  }
}

testSyncProcess();
