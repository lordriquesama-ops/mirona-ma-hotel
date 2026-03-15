// Debug booking creation and storage
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

async function debugBookings() {
  console.log('🔍 Debugging Booking Storage...\n');

  try {
    // Step 1: Login to get token
    console.log('1️⃣ Getting authentication token...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const { token } = await loginResponse.json();
    console.log('✅ Authentication successful\n');

    // Step 2: Check current bookings in PostgreSQL
    console.log('2️⃣ Checking existing bookings in PostgreSQL...');
    const bookingsResponse = await fetch(`${API_BASE}/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (bookingsResponse.ok) {
      const bookings = await bookingsResponse.json();
      console.log(`📊 Found ${bookings.length} bookings in PostgreSQL:`);
      
      if (bookings.length > 0) {
        bookings.forEach((booking, index) => {
          console.log(`   ${index + 1}. ${booking.guestName} - ${booking.roomName} - ${booking.status}`);
        });
      } else {
        console.log('   No bookings found in PostgreSQL');
      }
    } else {
      console.log('❌ Failed to fetch bookings from PostgreSQL');
    }

    console.log('\n3️⃣ Creating a test booking in PostgreSQL...');
    
    // Step 3: Create a test booking directly via API
    const testBooking = {
      guestName: 'Test Guest',
      phone: '+256700000000',
      email: 'test@example.com',
      roomId: 'A1',
      roomName: 'A1',
      roomPrice: 50000,
      checkInDate: new Date().toISOString(),
      checkOutDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      adults: 2,
      children: 0,
      guests: 1,
      amount: 50000,
      paidAmount: 0,
      paymentMethod: 'Cash',
      status: 'CONFIRMED',
      notes: 'Test booking created via API'
    };

    const createResponse = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testBooking)
    });

    if (createResponse.ok) {
      const createdBooking = await createResponse.json();
      console.log('✅ Test booking created successfully in PostgreSQL!');
      console.log(`   ID: ${createdBooking.id}`);
      console.log(`   Guest: ${createdBooking.guestName}`);
      console.log(`   Room: ${createdBooking.roomName}`);
    } else {
      const error = await createResponse.json();
      console.log('❌ Failed to create test booking:', error);
    }

    console.log('\n4️⃣ Checking bookings again...');
    const checkResponse = await fetch(`${API_BASE}/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (checkResponse.ok) {
      const finalBookings = await checkResponse.json();
      console.log(`📊 Total bookings in PostgreSQL: ${finalBookings.length}`);
      
      const testBooking = finalBookings.find(b => b.guestName === 'Test Guest');
      if (testBooking) {
        console.log('✅ Test booking found in PostgreSQL!');
        console.log(`   Created at: ${testBooking.createdAt}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugBookings();
