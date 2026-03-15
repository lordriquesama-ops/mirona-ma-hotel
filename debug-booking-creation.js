// Debug and fix booking creation
async function debugBookingCreation() {
  console.log('🔍 DEBUGGING BOOKING CREATION');
  console.log('==============================\n');

  try {
    // Step 1: Login
    console.log('1️⃣ Getting authentication token...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Authentication successful');

    // Step 2: Check available rooms
    console.log('\n2️⃣ Checking available rooms...');
    const roomsResponse = await fetch('http://localhost:3001/api/rooms', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (roomsResponse.ok) {
      const rooms = await roomsResponse.json();
      console.log(`📊 Found ${rooms.length} rooms`);
      
      if (rooms.length > 0) {
        const availableRoom = rooms.find(r => r.status === 'Available');
        if (availableRoom) {
          console.log(`✅ Found available room: ${availableRoom.name} (Price: ${availableRoom.price})`);
          
          // Step 3: Create booking with actual room data
          console.log('\n3️⃣ Creating booking with real room data...');
          const testBooking = {
            guestName: 'Debug Test Guest',
            phone: '+256700000999',
            email: 'test@example.com',
            roomId: availableRoom.id,
            roomName: availableRoom.name,
            roomPrice: availableRoom.price,
            checkInDate: new Date().toISOString(),
            checkOutDate: new Date(Date.now() + 86400000).toISOString(),
            adults: 2,
            children: 0,
            guests: 1,
            amount: availableRoom.price,
            paidAmount: 0,
            paymentMethod: 'Cash',
            status: 'CONFIRMED',
            notes: 'Debug booking creation test'
          };

          console.log('📋 Booking data:', JSON.stringify(testBooking, null, 2));

          const createResponse = await fetch('http://localhost:3001/api/bookings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(testBooking)
          });

          console.log(`\n📊 Booking creation status: ${createResponse.status}`);
          
          if (createResponse.ok) {
            const createdBooking = await createResponse.json();
            console.log('✅ SUCCESS! Booking created:');
            console.log(`   ID: ${createdBooking.id}`);
            console.log(`   Guest: ${createdBooking.guestName}`);
            console.log(`   Room: ${createdBooking.roomName}`);
            console.log(`   Price: ${createdBooking.roomPrice}`);
            console.log(`   Status: ${createdBooking.status}`);
            
            // Clean up
            await fetch(`http://localhost:3001/api/bookings/${createdBooking.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('🧹 Test booking cleaned up');
            
          } else {
            console.log('❌ Booking creation failed');
            const errorText = await createResponse.text();
            console.log('Error details:', errorText);
            
            // Try to analyze the error
            if (errorText.includes('roomPrice')) {
              console.log('\n🔧 ISSUE: roomPrice field problem');
              console.log('   - Check if roomPrice is in the schema');
              console.log('   - Check if roomPrice is being passed correctly');
            } else if (errorText.includes('PrismaClientValidationError')) {
              console.log('\n🔧 ISSUE: Prisma validation error');
              console.log('   - Required field missing');
              console.log('   - Data type mismatch');
            }
          }
        } else {
          console.log('❌ No available rooms found');
        }
      } else {
        console.log('❌ No rooms found - need to create rooms first');
      }
    } else {
      console.log('❌ Failed to fetch rooms');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugBookingCreation();
