// Test CRUD Operations with Supabase
// Run with: node test-crud-operations.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wyelzqqqmrkwqtduqamf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWx6cXFxbXJrd3F0ZHVxYW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTgwMzgsImV4cCI6MjA4ODYzNDAzOH0.syKfjzt3_WpPE7KXeJqUM8B5oV5k86A1x2fLybDUjtA';

console.log('🧪 Testing CRUD Operations...\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCRUD() {
  const results = [];
  
  // Test 1: Create Room
  console.log('1️⃣ Testing CREATE - Adding a test room...');
  try {
    const testRoom = {
      id: `TEST-${Date.now()}`,
      name: `Test Room ${Date.now()}`,
      category_id: (await supabase.from('categories').select('id').limit(1).single()).data?.id || 'test-cat',
      category_name: 'Test Category',
      price: 50000,
      status: 'Available',
      color: 'bg-blue-500',
      floor: 1,
      notes: 'Test room for CRUD verification'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('rooms')
      .insert(testRoom)
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    results.push({ 
      test: 'CREATE Room', 
      status: '✅ PASS', 
      details: `Created room: ${insertData.name}`,
      data: insertData
    });
  } catch (error) {
    results.push({ test: 'CREATE Room', status: '❌ FAIL', details: error.message });
  }

  // Test 2: Read Rooms
  console.log('2️⃣ Testing READ - Fetching rooms...');
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    
    results.push({ 
      test: 'READ Rooms', 
      status: '✅ PASS', 
      details: `Found ${data.length} rooms`
    });
  } catch (error) {
    results.push({ test: 'READ Rooms', status: '❌ FAIL', details: error.message });
  }

  // Test 3: Update Room
  console.log('3️⃣ Testing UPDATE - Updating test room...');
  try {
    const createResult = results.find(r => r.test === 'CREATE Room');
    if (!createResult || !createResult.data) throw new Error('No room to update');
    
    const roomId = createResult.data.id;
    const { data, error } = await supabase
      .from('rooms')
      .update({ 
        status: 'Occupied',
        notes: 'Updated by CRUD test'
      })
      .eq('id', roomId)
      .select()
      .single();
    
    if (error) throw error;
    
    results.push({ 
      test: 'UPDATE Room', 
      status: '✅ PASS', 
      details: `Updated room status to: ${data.status}`,
      data: data
    });
  } catch (error) {
    results.push({ test: 'UPDATE Room', status: '❌ FAIL', details: error.message });
  }

  // Test 4: Create Booking
  console.log('4️⃣ Testing CREATE - Adding a test booking...');
  try {
    const createResult = results.find(r => r.test === 'CREATE Room');
    if (!createResult || !createResult.data) throw new Error('No room for booking');
    
    const room = createResult.data;
    const testBooking = {
      booking_number: `BK-TEST-${Date.now()}`,
      guest_name: 'Test Guest',
      phone: `+256-TEST-${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      room_id: room.id,
      room_name: room.name,
      room_price: room.price,
      check_in_date: new Date().toISOString(),
      check_out_date: new Date(Date.now() + 86400000).toISOString(),
      adults: 2,
      children: 0,
      guests: 2,
      amount: room.price,
      paid_amount: 0,
      status: 'CONFIRMED',
      user_id: (await supabase.from('users').select('id').limit(1).single()).data?.id
    };
    
    const { data, error } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()
      .single();
    
    if (error) throw error;
    
    results.push({ 
      test: 'CREATE Booking', 
      status: '✅ PASS', 
      details: `Created booking: ${data.booking_number}`,
      data: data
    });
  } catch (error) {
    results.push({ test: 'CREATE Booking', status: '❌ FAIL', details: error.message });
  }

  // Test 5: Read Bookings
  console.log('5️⃣ Testing READ - Fetching bookings...');
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    
    results.push({ 
      test: 'READ Bookings', 
      status: '✅ PASS', 
      details: `Found ${data.length} bookings`
    });
  } catch (error) {
    results.push({ test: 'READ Bookings', status: '❌ FAIL', details: error.message });
  }

  // Test 6: Update Booking
  console.log('6️⃣ Testing UPDATE - Updating test booking...');
  try {
    const createResult = results.find(r => r.test === 'CREATE Booking');
    if (!createResult || !createResult.data) throw new Error('No booking to update');
    
    const bookingId = createResult.data.id;
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'CHECKED_IN',
        paid_amount: createResult.data.amount
      })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) throw error;
    
    results.push({ 
      test: 'UPDATE Booking', 
      status: '✅ PASS', 
      details: `Updated booking status to: ${data.status}`
    });
  } catch (error) {
    results.push({ test: 'UPDATE Booking', status: '❌ FAIL', details: error.message });
  }

  // Test 7: Create Guest
  console.log('7️⃣ Testing CREATE - Adding a test guest...');
  try {
    const testGuest = {
      name: 'Test Guest',
      phone: `+256-GUEST-${Date.now()}`,
      email: `guest${Date.now()}@example.com`,
      identification: `TEST-ID-${Date.now()}`,
      identification_type: 'Test ID',
      visits: 1,
      total_spent: 50000,
      is_vip: false
    };
    
    const { data, error } = await supabase
      .from('guests')
      .insert(testGuest)
      .select()
      .single();
    
    if (error) throw error;
    
    results.push({ 
      test: 'CREATE Guest', 
      status: '✅ PASS', 
      details: `Created guest: ${data.name}`,
      data: data
    });
  } catch (error) {
    results.push({ test: 'CREATE Guest', status: '❌ FAIL', details: error.message });
  }

  // Test 8: Delete Booking (cleanup)
  console.log('8️⃣ Testing DELETE - Removing test booking...');
  try {
    const createResult = results.find(r => r.test === 'CREATE Booking');
    if (!createResult || !createResult.data) throw new Error('No booking to delete');
    
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', createResult.data.id);
    
    if (error) throw error;
    
    results.push({ 
      test: 'DELETE Booking', 
      status: '✅ PASS', 
      details: 'Booking deleted successfully'
    });
  } catch (error) {
    results.push({ test: 'DELETE Booking', status: '❌ FAIL', details: error.message });
  }

  // Test 9: Delete Guest (cleanup)
  console.log('9️⃣ Testing DELETE - Removing test guest...');
  try {
    const createResult = results.find(r => r.test === 'CREATE Guest');
    if (!createResult || !createResult.data) throw new Error('No guest to delete');
    
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', createResult.data.id);
    
    if (error) throw error;
    
    results.push({ 
      test: 'DELETE Guest', 
      status: '✅ PASS', 
      details: 'Guest deleted successfully'
    });
  } catch (error) {
    results.push({ test: 'DELETE Guest', status: '❌ FAIL', details: error.message });
  }

  // Test 10: Delete Room (cleanup)
  console.log('🔟 Testing DELETE - Removing test room...');
  try {
    const createResult = results.find(r => r.test === 'CREATE Room');
    if (!createResult || !createResult.data) throw new Error('No room to delete');
    
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', createResult.data.id);
    
    if (error) throw error;
    
    results.push({ 
      test: 'DELETE Room', 
      status: '✅ PASS', 
      details: 'Room deleted successfully'
    });
  } catch (error) {
    results.push({ test: 'DELETE Room', status: '❌ FAIL', details: error.message });
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 CRUD TEST SUMMARY');
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.test.padEnd(25)} ${result.status.padEnd(10)} ${result.details}`);
  });
  
  const passed = results.filter(r => r.status.includes('✅')).length;
  const failed = results.filter(r => r.status.includes('❌')).length;
  
  console.log('='.repeat(80));
  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All CRUD operations working perfectly!');
    console.log('✅ Your app can now:');
    console.log('   - Create rooms, bookings, and guests');
    console.log('   - Read all data from Supabase');
    console.log('   - Update existing records');
    console.log('   - Delete records');
    console.log('\n🚀 Your frontend is fully connected to Supabase!');
  } else {
    console.log('\n⚠️  Some CRUD operations failed. Check the errors above.');
  }
}

testCRUD().catch(console.error);
