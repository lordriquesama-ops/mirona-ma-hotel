// Test Supabase Connection
// Run with: node test-supabase-connection.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wyelzqqqmrkwqtduqamf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWx6cXFxbXJrd3F0ZHVxYW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTgwMzgsImV4cCI6MjA4ODYzNDAzOH0.syKfjzt3_WpPE7KXeJqUM8B5oV5k86A1x2fLybDUjtA';

console.log('🔍 Testing Supabase Connection...\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  const tests = [];
  
  // Test 1: Connection
  console.log('1️⃣ Testing basic connection...');
  try {
    const { data, error } = await supabase.from('users').select('count');
    if (error) throw error;
    tests.push({ name: 'Connection', status: '✅ PASS', details: 'Connected successfully' });
  } catch (error) {
    tests.push({ name: 'Connection', status: '❌ FAIL', details: error.message });
  }

  // Test 2: Users table
  console.log('2️⃣ Testing users table...');
  try {
    const { data, error } = await supabase.from('users').select('*').limit(5);
    if (error) throw error;
    tests.push({ name: 'Users Table', status: '✅ PASS', details: `Found ${data.length} users` });
  } catch (error) {
    tests.push({ name: 'Users Table', status: '❌ FAIL', details: error.message });
  }

  // Test 3: Rooms table
  console.log('3️⃣ Testing rooms table...');
  try {
    const { data, error } = await supabase.from('rooms').select('*').limit(5);
    if (error) throw error;
    tests.push({ name: 'Rooms Table', status: '✅ PASS', details: `Found ${data.length} rooms` });
  } catch (error) {
    tests.push({ name: 'Rooms Table', status: '❌ FAIL', details: error.message });
  }

  // Test 4: Bookings table
  console.log('4️⃣ Testing bookings table...');
  try {
    const { data, error } = await supabase.from('bookings').select('*').limit(5);
    if (error) throw error;
    tests.push({ name: 'Bookings Table', status: '✅ PASS', details: `Found ${data.length} bookings` });
  } catch (error) {
    tests.push({ name: 'Bookings Table', status: '❌ FAIL', details: error.message });
  }

  // Test 5: Categories table
  console.log('5️⃣ Testing categories table...');
  try {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    tests.push({ name: 'Categories Table', status: '✅ PASS', details: `Found ${data.length} categories` });
  } catch (error) {
    tests.push({ name: 'Categories Table', status: '❌ FAIL', details: error.message });
  }

  // Test 6: Guests table
  console.log('6️⃣ Testing guests table...');
  try {
    const { data, error } = await supabase.from('guests').select('*').limit(5);
    if (error) throw error;
    tests.push({ name: 'Guests Table', status: '✅ PASS', details: `Found ${data.length} guests` });
  } catch (error) {
    tests.push({ name: 'Guests Table', status: '❌ FAIL', details: error.message });
  }

  // Test 7: Services table
  console.log('7️⃣ Testing services table...');
  try {
    const { data, error } = await supabase.from('services').select('*').limit(5);
    if (error) throw error;
    tests.push({ name: 'Services Table', status: '✅ PASS', details: `Found ${data.length} services` });
  } catch (error) {
    tests.push({ name: 'Services Table', status: '❌ FAIL', details: error.message });
  }

  // Test 8: Settings table
  console.log('8️⃣ Testing settings table...');
  try {
    const { data, error } = await supabase.from('settings').select('*').single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found is OK
    tests.push({ name: 'Settings Table', status: '✅ PASS', details: data ? 'Settings found' : 'No settings (OK)' });
  } catch (error) {
    tests.push({ name: 'Settings Table', status: '❌ FAIL', details: error.message });
  }

  // Test 9: Audit logs table
  console.log('9️⃣ Testing audit_logs table...');
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').limit(5);
    if (error) throw error;
    tests.push({ name: 'Audit Logs Table', status: '✅ PASS', details: `Found ${data.length} logs` });
  } catch (error) {
    tests.push({ name: 'Audit Logs Table', status: '❌ FAIL', details: error.message });
  }

  // Test 10: Write operation (insert and delete) - Skip if RLS blocks
  console.log('🔟 Testing write operations...');
  try {
    const testGuest = {
      name: 'Test Guest',
      phone: `+256-TEST-${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      identification: `TEST-${Date.now()}`,
      identification_type: 'Test ID',
      visits: 0,
      total_spent: 0,
      is_vip: false
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('guests')
      .insert(testGuest)
      .select()
      .single();
    
    if (insertError) {
      // Check if it's an RLS error
      if (insertError.message.includes('row-level security')) {
        tests.push({ name: 'Write Operations', status: '🟡 SKIP', details: 'RLS blocking (expected without auth)' });
      } else {
        throw insertError;
      }
    } else {
      // Clean up - delete the test guest
      const { error: deleteError } = await supabase
        .from('guests')
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) throw deleteError;
      
      tests.push({ name: 'Write Operations', status: '✅ PASS', details: 'Insert and delete successful' });
    }
  } catch (error) {
    tests.push({ name: 'Write Operations', status: '❌ FAIL', details: error.message });
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name.padEnd(25)} ${test.status.padEnd(10)} ${test.details}`);
  });
  
  const passed = tests.filter(t => t.status.includes('✅')).length;
  const failed = tests.filter(t => t.status.includes('❌')).length;
  const skipped = tests.filter(t => t.status.includes('🟡')).length;
  
  console.log('='.repeat(80));
  console.log(`\n✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  if (skipped > 0) console.log(`🟡 Skipped: ${skipped}/${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All critical tests passed! Supabase is properly connected.');
    
    // Check if tables are empty
    const emptyTables = tests.filter(t => 
      t.details.includes('Found 0') && 
      !t.name.includes('Settings') && 
      !t.name.includes('Logs')
    );
    
    if (emptyTables.length > 0) {
      console.log('\n⚠️  IMPORTANT: Your database tables are empty!');
      console.log('📋 Next step: Deploy the database schema');
      console.log('   1. Go to: https://supabase.com/dashboard');
      console.log('   2. Open SQL Editor');
      console.log('   3. Run the file: supabase-schema.sql');
      console.log('   4. Run this test again to verify data');
    }
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

testConnection().catch(console.error);
