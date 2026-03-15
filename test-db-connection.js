// Test database connection and data flow
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

async function testDatabaseConnection() {
  console.log('🔍 Testing PostgreSQL Backend Connection...\n');

  try {
    // Test 1: Check if backend is running
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await fetch('http://localhost:3001/health');
    if (!healthResponse.ok) {
      throw new Error('Backend not responding');
    }
    console.log('✅ Backend is running\n');

    // Test 2: Test login (this hits PostgreSQL)
    console.log('2️⃣ Testing authentication with PostgreSQL...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
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
    console.log('✅ Authentication successful - PostgreSQL users found!');
    console.log(`   User: ${loginData.user.name} (${loginData.user.role})\n`);

    // Test 3: Test data retrieval from PostgreSQL
    console.log('3️⃣ Testing data retrieval from PostgreSQL...');
    const token = loginData.token;
    
    const categoriesResponse = await fetch(`${API_BASE}/categories`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!categoriesResponse.ok) {
      throw new Error('Failed to fetch categories');
    }

    const categories = await categoriesResponse.json();
    console.log(`✅ Retrieved ${categories.length} categories from PostgreSQL`);
    
    if (categories.length > 0) {
      console.log(`   First category: ${categories[0].name} - ${categories[0].price} UGX`);
    }

    // Test 4: Test rooms data
    const roomsResponse = await fetch(`${API_BASE}/rooms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (roomsResponse.ok) {
      const rooms = await roomsResponse.json();
      console.log(`✅ Retrieved ${rooms.length} rooms from PostgreSQL`);
    }

    console.log('\n🎉 SUCCESS! Your system is using PostgreSQL database!');
    console.log('📊 Data is being stored and retrieved from PostgreSQL, not IndexedDB.');

  } catch (error) {
    console.log('\n❌ ERROR: Backend connection failed');
    console.log(`Error: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure backend server is running (start-backend.bat)');
    console.log('2. Check PostgreSQL is running on localhost:5432');
    console.log('3. Verify database "mirona_hotel" exists');
    console.log('4. Check .env file has correct DATABASE_URL');
  }
}

testDatabaseConnection();
