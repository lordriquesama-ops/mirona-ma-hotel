// Comprehensive QA Audit for Mirona Hotel Management System
async function runQAAudit() {
  console.log('🔍 QA AUDIT: Mirona Hotel Management System');
  console.log('=' .repeat(60));
  
  const auditResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  // Helper functions
  const logTest = (name, passed, message, details = '') => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const warning = message.includes('WARNING') ? '⚠️ ' : '';
    console.log(`${status} ${warning}${name}: ${message}`);
    if (details) console.log(`    ${details}`);
    
    if (passed) auditResults.passed++;
    else if (message.includes('WARNING')) {
      auditResults.warnings++;
    } else {
      auditResults.failed++;
    }
    
    auditResults.details.push({ name, passed, message, details });
  };

  // Test 1: Configuration Alignment
  console.log('\n📋 1. CONFIGURATION ALIGNMENT');
  console.log('-'.repeat(40));
  
  try {
    // Check USE_BACKEND setting - read file using Node.js fs
    const fs = await import('fs');
    const configContent = fs.readFileSync('./services/config.ts', 'utf8');
    const useBackend = configContent.includes('USE_BACKEND = true');
    const apiUrl = configContent.includes('localhost:3001') ? 'http://localhost:3001/api' : 'Unknown';
    
    logTest('USE_BACKEND Setting', useBackend, `Backend integration ${useBackend ? 'enabled' : 'disabled'}`);
    logTest('API Base URL', apiUrl.includes('localhost:3001'), `Points to ${apiUrl}`);
    
    // Check frontend types vs backend schema
    const typesContent = fs.readFileSync('./types.ts', 'utf8');
    const hasCorrectRoles = typesContent.includes("'ADMIN' | 'MANAGER' | 'RECEPTION' | 'MARKETING'");
    const hasCorrectRoomStatus = typesContent.includes("'Available' | 'Occupied' | 'Cleaning' | 'Maintenance'");
    
    logTest('Role Types Alignment', hasCorrectRoles, 'Frontend roles defined correctly');
    logTest('Room Status Types', hasCorrectRoomStatus, 'Frontend room statuses defined correctly');
    
  } catch (error) {
    logTest('Configuration Check', false, `Failed to check config: ${error.message}`);
  }

  // Test 2: Backend Health Check
  console.log('\n🏥 2. BACKEND HEALTH CHECK');
  console.log('-'.repeat(40));
  
  try {
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    
    logTest('Backend Server', healthResponse.ok, `Status: ${healthData.status}`);
    logTest('Server Uptime', healthData.uptime > 0, `Running for ${Math.floor(healthData.uptime)}s`);
    
  } catch (error) {
    logTest('Backend Connection', false, 'Backend server not responding', 'Start with: start-backend.bat');
  }

  // Test 3: Database Connection
  console.log('\n🐘 3. DATABASE CONNECTION');
  console.log('-'.repeat(40));
  
  try {
    // Test authentication (requires DB connection)
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      logTest('Database Authentication', true, `Connected as ${loginData.user.name}`);
      
      // Test data retrieval
      const token = loginData.token;
      const bookingsResponse = await fetch('http://localhost:3001/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (bookingsResponse.ok) {
        const bookings = await bookingsResponse.json();
        logTest('Data Retrieval', true, `Found ${bookings.length} bookings`);
        
        // Test categories
        const categoriesResponse = await fetch('http://localhost:3001/api/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (categoriesResponse.ok) {
          const categories = await categoriesResponse.json();
          logTest('Default Categories', categories.length === 4, `Found ${categories.length} categories`);
          
          // Test rooms
          const roomsResponse = await fetch('http://localhost:3001/api/rooms', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (roomsResponse.ok) {
            const rooms = await roomsResponse.json();
            logTest('Default Rooms', rooms.length === 38, `Found ${rooms.length} rooms`);
          } else {
            logTest('Rooms API', false, 'Failed to fetch rooms');
          }
        } else {
          logTest('Categories API', false, 'Failed to fetch categories');
        }
      } else {
        logTest('Bookings API', false, 'Failed to fetch bookings');
      }
    } else {
      logTest('Database Auth', false, 'Authentication failed - DB connection issue');
    }
    
  } catch (error) {
    logTest('Database Connection', false, `Connection failed: ${error.message}`);
  }

  // Test 4: API Endpoints
  console.log('\n🔌 4. API ENDPOINTS');
  console.log('-'.repeat(40));
  
  const endpoints = [
    { path: '/health', auth: false, name: 'Health Check' },
    { path: '/api/categories', auth: true, name: 'Categories' },
    { path: '/api/rooms', auth: true, name: 'Rooms' },
    { path: '/api/bookings', auth: true, name: 'Bookings' },
    { path: '/api/guests', auth: true, name: 'Guests' },
    { path: '/api/services', auth: true, name: 'Services' },
    { path: '/api/settings', auth: true, name: 'Settings' },
    { path: '/api/audit-logs', auth: true, name: 'Audit Logs' },
    { path: '/api/shifts', auth: true, name: 'Shifts' }
  ];

  let authToken = '';
  
  // Get auth token first
  try {
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.token;
    }
  } catch (error) {
    // Skip auth-required endpoints
  }

  for (const endpoint of endpoints) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (endpoint.auth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`http://localhost:3001${endpoint.path}`, { headers });
      logTest(`${endpoint.name} Endpoint`, 
        response.ok || (!endpoint.auth && !authToken), 
        response.ok ? 'OK' : (!endpoint.auth && !authToken ? 'Skipped (no auth)' : `Failed: ${response.status}`)
      );
    } catch (error) {
      logTest(`${endpoint.name} Endpoint`, false, `Error: ${error.message}`);
    }
  }

  // Test 5: Data Flow Validation
  console.log('\n🔄 5. DATA FLOW VALIDATION');
  console.log('-'.repeat(40));
  
  if (authToken) {
    try {
      // Test creating a booking
      const testBooking = {
        guestName: 'QA Test Guest',
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

      const createResponse = await fetch('http://localhost:3001/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(testBooking)
      });

      if (createResponse.ok) {
        const createdBooking = await createResponse.json();
        logTest('Create Booking', true, `ID: ${createdBooking.id}`);
        
        // Verify booking was saved
        const verifyResponse = await fetch('http://localhost:3001/api/bookings', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (verifyResponse.ok) {
          const bookings = await verifyResponse.json();
          const foundBooking = bookings.find(b => b.id === createdBooking.id);
          logTest('Booking Persistence', !!foundBooking, foundBooking ? 'Found in database' : 'Not found');
          
          // Clean up - delete test booking
          if (foundBooking) {
            await fetch(`http://localhost:3001/api/bookings/${createdBooking.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
          }
        }
      } else {
        logTest('Create Booking', false, `Failed: ${createResponse.status}`);
      }
    } catch (error) {
      logTest('Data Flow Test', false, `Error: ${error.message}`);
    }
  } else {
    logTest('Data Flow Tests', false, 'Skipped - no authentication');
  }

  // Test 6: Error Handling
  console.log('\n⚠️ 6. ERROR HANDLING');
  console.log('-'.repeat(40));
  
  try {
    // Test invalid login
    const invalidLogin = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'invalid', password: 'wrong' })
    });
    
    logTest('Invalid Credentials', invalidLogin.status === 401, 'Properly rejects bad credentials');
    
    // Test unauthorized access
    const unauthorized = await fetch('http://localhost:3001/api/bookings');
    logTest('Unauthorized Access', unauthorized.status === 401, 'Protects endpoints without auth');
    
    // Test invalid endpoint
    const notFound = await fetch('http://localhost:3001/api/invalid-endpoint');
    logTest('404 Handling', notFound.status === 404, 'Properly handles invalid endpoints');
    
  } catch (error) {
    logTest('Error Handling', false, `Error testing: ${error.message}`);
  }

  // Results Summary
  console.log('\n📊 AUDIT RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${auditResults.passed}`);
  console.log(`❌ Failed: ${auditResults.failed}`);
  console.log(`⚠️  Warnings: ${auditResults.warnings}`);
  console.log(`📈 Success Rate: ${Math.round((auditResults.passed / (auditResults.passed + auditResults.failed)) * 100)}%`);
  
  if (auditResults.failed > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND:');
    auditResults.details
      .filter(test => !test.passed && !test.message.includes('WARNING'))
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.message}`);
      });
  }
  
  if (auditResults.warnings > 0) {
    console.log('\n⚠️  WARNINGS:');
    auditResults.details
      .filter(test => !test.passed && test.message.includes('WARNING'))
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.message}`);
      });
  }
  
  console.log('\n🎯 RECOMMENDATIONS:');
  if (auditResults.failed === 0) {
    console.log('   ✅ System is functioning correctly!');
    console.log('   ✅ All components are properly connected');
    console.log('   ✅ Data flow is working as expected');
  } else {
    console.log('   🔧 Fix critical issues before production deployment');
    console.log('   🔧 Ensure backend server is running');
    console.log('   🔧 Verify database connection and seeding');
  }
}

runQAAudit().catch(console.error);
