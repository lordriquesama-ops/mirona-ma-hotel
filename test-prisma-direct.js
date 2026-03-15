// Test Prisma booking creation directly
async function testPrismaDirect() {
  console.log('🔍 TESTING PRISMA DIRECT BOOKING CREATION');
  console.log('==========================================\n');

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

    // Step 3: Create booking directly with Prisma
    console.log('\n📋 Creating booking directly with Prisma...');

    const bookingData = {
      guestName: 'Direct Test Guest',
      phone: '+256700000999',
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
      bookingNumber: `BK-DIRECT-${Date.now()}`
    };

    console.log('Booking data:', JSON.stringify(bookingData, null, 2));

    try {
      const booking = await prisma.booking.create({
        data: bookingData
      });

      console.log('✅ SUCCESS! Direct Prisma booking created:');
      console.log(`   ID: ${booking.id}`);
      console.log(`   Guest: ${booking.guestName}`);
      console.log(`   Room: ${booking.roomName}`);
      console.log(`   Status: ${booking.status}`);

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
      console.log('🧹 Test booking cleaned up');

    } catch (prismaError) {
      console.log('❌ Prisma booking creation failed:');
      console.log('Error:', prismaError.message);
      console.log('Stack:', prismaError.stack);
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPrismaDirect();
