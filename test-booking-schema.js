// Test booking schema validation
async function testBookingSchema() {
  console.log('🔍 TESTING BOOKING SCHEMA VALIDATION');
  console.log('=====================================\n');

  try {
    // Step 1: Login
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });

    const { token } = await loginResponse.json();
    console.log('✅ Authentication successful');

    // Step 2: Test with different booking data variations
    const testCases = [
      {
        name: 'Minimal booking',
        data: {
          guestName: 'Test Guest',
          phone: '+256700000999',
          roomId: 'C1',
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(),
          adults: 2,
          amount: 20000,
          status: 'CONFIRMED'
        }
      },
      {
        name: 'Complete booking',
        data: {
          guestName: 'Test Guest',
          phone: '+256700000999',
          email: 'test@example.com',
          roomId: 'C1',
          roomName: 'C1',
          roomPrice: 20000,
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(),
          adults: 2,
          children: 0,
          guests: 1,
          amount: 20000,
          paidAmount: 0,
          paymentMethod: 'Cash',
          status: 'CONFIRMED',
          notes: 'Test booking'
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📋 Testing: ${testCase.name}`);
      console.log('Data:', JSON.stringify(testCase.data, null, 2));

      const response = await fetch('http://localhost:3001/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testCase.data)
      });

      console.log(`Status: ${response.status}`);
      
      const responseText = await response.text();
      console.log('Response:', responseText);

      if (response.ok) {
        console.log('✅ SUCCESS!');
        // Clean up
        const result = JSON.parse(responseText);
        await fetch(`http://localhost:3001/api/bookings/${result.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        console.log('❌ FAILED');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBookingSchema();
