// PROVE WHERE DATA IS ACTUALLY STORED
async function proveDataLocation() {
  console.log('🔍 PROVING DATA STORAGE LOCATION');
  console.log('=====================================\n');

  try {
    // Step 1: Test PostgreSQL Direct Connection
    console.log('1️⃣ Testing DIRECT PostgreSQL Connection...');
    const { PrismaClient } = await import('./backend/node_modules/@prisma/client/index.js');
    const prisma = new PrismaClient();
    
    try {
      await prisma.$connect();
      console.log('✅ Connected to PostgreSQL directly');
      
      // Count users in PostgreSQL
      const userCount = await prisma.user.count();
      console.log(`📊 Users in PostgreSQL: ${userCount}`);
      
      if (userCount > 0) {
        const users = await prisma.user.findMany({ take: 2 });
        console.log('Sample users from PostgreSQL:');
        users.forEach(user => {
          console.log(`   - ${user.name} (${user.role}) - ID: ${user.id}`);
        });
      }
      
      // Count categories in PostgreSQL
      const categoryCount = await prisma.roomCategory.count();
      console.log(`📊 Categories in PostgreSQL: ${categoryCount}`);
      
      // Count rooms in PostgreSQL
      const roomCount = await prisma.room.count();
      console.log(`📊 Rooms in PostgreSQL: ${roomCount}`);
      
      // Count bookings in PostgreSQL
      const bookingCount = await prisma.booking.count();
      console.log(`📊 Bookings in PostgreSQL: ${bookingCount}`);
      
      await prisma.$disconnect();
      
    } catch (dbError) {
      console.log('❌ PostgreSQL connection failed:', dbError.message);
      return;
    }

    console.log('\n2️⃣ Testing Backend API Connection...');
    
    // Step 2: Test via Backend API
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });

    if (!loginResponse.ok) {
      console.log('❌ Backend API not responding');
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Backend API is working');
    console.log(`   Logged in as: ${loginData.user.name}`);

    const token = loginData.token;

    // Get data via API
    const apiUsers = await fetch('http://localhost:3001/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (apiUsers.ok) {
      const users = await apiUsers.json();
      console.log(`📊 Users via API: ${users.length}`);
    }

    console.log('\n3️⃣ Creating Test Data to PROVE Storage...');
    
    // Step 3: Create a test booking and prove where it goes
    const testBooking = {
      guestName: 'PROOF TEST Guest',
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

    console.log('Creating test booking...');
    const createResponse = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testBooking)
    });

    if (createResponse.ok) {
      const createdBooking = await createResponse.json();
      console.log('✅ Test booking created via API');
      console.log(`   Booking ID: ${createdBooking.id}`);
      
      // Step 4: Check PostgreSQL directly for this booking
      console.log('\n4️⃣ Verifying in PostgreSQL directly...');
      const prisma2 = new PrismaClient();
      await prisma2.$connect();
      
      const directBooking = await prisma2.booking.findUnique({
        where: { id: createdBooking.id }
      });
      
      if (directBooking) {
        console.log('🎯 PROOF! Booking found in PostgreSQL:');
        console.log(`   Guest: ${directBooking.guestName}`);
        console.log(`   Room: ${directBooking.roomName}`);
        console.log(`   Amount: ${directBooking.amount}`);
        console.log(`   Created: ${directBooking.createdAt}`);
        console.log('\n✅ DATA IS DEFINITELY STORED IN POSTGRESQL!');
      } else {
        console.log('❌ Booking NOT found in PostgreSQL - this means data is elsewhere');
      }
      
      // Clean up
      await prisma2.booking.delete({ where: { id: createdBooking.id } });
      await prisma2.$disconnect();
      
    } else {
      console.log('❌ Failed to create test booking');
    }

    console.log('\n5️⃣ Checking if you might be looking at wrong database...');
    
    // Step 5: Check database connection details
    const prisma3 = new PrismaClient();
    await prisma3.$connect();
    
    const dbInfo = await prisma3.$queryRaw`
      SELECT current_database() as database, 
             current_user as user,
             version() as version
    `;
    
    console.log('📋 Database Connection Info:');
    console.log(`   Database: ${dbInfo[0].database}`);
    console.log(`   User: ${dbInfo[0].user}`);
    console.log(`   Server: ${dbInfo[0].version.split(' ')[0]}`);
    
    await prisma3.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

proveDataLocation();
