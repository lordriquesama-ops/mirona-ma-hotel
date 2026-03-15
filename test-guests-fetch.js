/**
 * Test script to verify guests are being fetched from Supabase
 * Run this in browser console to debug guest fetching issues
 */

async function testGuestsFetch() {
  console.log('🧪 Testing Guests Fetch...\n');

  try {
    // Import the getGuests function
    const { getGuests } = await import('./services/db.js');
    
    console.log('1️⃣ Calling getGuests()...');
    const guests = await getGuests();
    
    console.log(`\n✅ SUCCESS: Fetched ${guests.length} guests\n`);
    
    if (guests.length === 0) {
      console.warn('⚠️ No guests found in database!');
      console.log('\nPossible reasons:');
      console.log('1. No bookings have been created yet');
      console.log('2. Guests table is empty in Supabase');
      console.log('3. RLS policies are blocking access');
      console.log('\nTo fix:');
      console.log('- Create a booking (guests are auto-created from bookings)');
      console.log('- Check Supabase Table Editor → guests table');
      console.log('- Verify RLS policies allow SELECT');
    } else {
      console.log('📋 Guest List:');
      guests.forEach((guest, index) => {
        console.log(`\n${index + 1}. ${guest.name}`);
        console.log(`   Phone: ${guest.phone}`);
        console.log(`   Email: ${guest.email || 'N/A'}`);
        console.log(`   Visits: ${guest.visits || 0}`);
        console.log(`   Total Spent: UGX ${guest.totalSpent || 0}`);
        console.log(`   VIP: ${guest.isVip ? 'Yes' : 'No'}`);
      });
    }
    
    // Check IndexedDB cache
    console.log('\n2️⃣ Checking IndexedDB cache...');
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('MironaDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    const transaction = db.transaction('guests', 'readonly');
    const store = transaction.objectStore('guests');
    const cachedGuests = await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
    
    console.log(`✅ IndexedDB has ${cachedGuests.length} cached guests`);
    
    if (cachedGuests.length !== guests.length) {
      console.warn(`⚠️ Cache mismatch! Supabase: ${guests.length}, IndexedDB: ${cachedGuests.length}`);
    }
    
    // Check Supabase directly
    console.log('\n3️⃣ Checking Supabase directly...');
    const { supabase } = await import('./services/supabase.js');
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase query error:', error);
    } else {
      console.log(`✅ Supabase has ${data.length} guests`);
    }
    
    console.log('\n✅ Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\nError details:', error.message);
    console.log('\nStack trace:', error.stack);
  }
}

// Run the test
testGuestsFetch();
