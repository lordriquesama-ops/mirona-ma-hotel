// Test booking creation with guest creation
async function testBookingWithGuest() {
  console.log('🔍 TESTING BOOKING WITH GUEST CREATION');
  console.log('======================================\n');

  try {
    const { PrismaClient } = await import('./backend/node_modules/@prisma/client/index.js');
    const prisma = new PrismaClient();

    await prisma.$connect();
    console.log('✅ Connected to Prisma directly');

    // Step 1: Get a room
    const room = await prisma.room.findFirst({
      where: { status: 'Available' }
    });

    if (!room) {
      console.log('❌ No available rooms found');
      return;
    }

    console.log(`📊 Using room: ${room.name} (Price: ${room.price})`);

    // Step 2: Get a user
    const user = await prisma.user.findFirst({
      where: { username: 'admin' }
    });

    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log(`👤 Using user: ${user.name}`);

    // Step 3: Create guest first
    console.log('\n👤 Creating guest first...');
    const guestPhone = '+256700000999';
    
    let guest = await prisma.guest.findUnique({
      where: { phone: guestPhone }
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          id: `guest-${Date.now()}`, // Add required ID
          name: 'Test Guest',
          phone: guestPhone,
          email: 'test@example.com',
          visits: 1,
          totalSpent: 0
        }
      });
      console.log('✅ Guest created:', guest.name);
    } else {
      console.log('✅ Using existing guest:', guest.name);
    }

    // Step 4: Create booking with guest
    console.log('\n📋 Creating booking with guest...');

    const bookingData = {
      guestName: 'Test Guest',
      phone: guestPhone, // This now references the created guest
      roomId: room.id,
      roomName: room.name,
      roomPrice: room.price,
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      adults: 2,
      amount: room.price,
      paidAmount: 0,
      paymentMethod: 'Cash',
      status: 'CONFIRMED',
      userId: user.id,
      bookingNumber: `BK-GUEST-${Date.now()}`
    };

    try {
      const booking = await prisma.booking.create({
        data: bookingData
      });

      console.log('✅ SUCCESS! Booking created with guest:');
      console.log(`   ID: ${booking.id}`);
      console.log(`   Guest: ${booking.guestName}`);
      console.log(`   Phone: ${booking.phone}`);
      console.log(`   Room: ${booking.roomName}`);
      console.log(`   Status: ${booking.status}`);

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
      console.log('🧹 Test booking cleaned up');

    } catch (prismaError) {
      console.log('❌ Booking creation still failed:');
      console.log('Error:', prismaError.message);
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBookingWithGuest();
