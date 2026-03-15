// Check database connection directly
async function checkDatabaseConnection() {
  console.log('🔍 Checking PostgreSQL Connection...\n');

  try {
    // Import Prisma client directly
    const { PrismaClient } = await import('./backend/node_modules/@prisma/client/index.js');
    const prisma = new PrismaClient();

    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL successfully!');

    console.log('\n2️⃣ Checking database info...');
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('📊 Database Info:');
    console.log(`   Database: ${result[0].current_database}`);
    console.log(`   User: ${result[0].current_user}`);
    console.log(`   Version: ${result[0].version.split(' ')[0]}`);

    console.log('\n3️⃣ Checking tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('📋 Tables found:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    console.log('\n4️⃣ Checking users table...');
    const userCount = await prisma.user.count();
    console.log(`👥 Users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({ take: 3 });
      console.log('Sample users:');
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.role})`);
      });
    }

    console.log('\n5️⃣ Checking bookings table...');
    const bookingCount = await prisma.booking.count();
    console.log(`📅 Bookings in database: ${bookingCount}`);

    await prisma.$disconnect();
    console.log('\n🎉 Database connection test completed successfully!');

  } catch (error) {
    console.error('\n❌ Database connection failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 PostgreSQL is not running or not accessible');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n🔧 Database "mirona_hotel" does not exist');
    } else if (error.message.includes('password') || error.message.includes('authentication')) {
      console.log('\n🔧 Authentication failed - check username/password');
    }
  }
}

checkDatabaseConnection();
