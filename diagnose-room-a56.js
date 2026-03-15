import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnoseA56() {
  console.log('🔍 Diagnosing Room A56 Display Issue\n');
  console.log('=' .repeat(60));
  
  // 1. Check if A56 exists in Supabase
  console.log('\n1️⃣ Checking if A56 exists in Supabase...');
  const { data: a56, error: a56Error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', 'A56')
    .single();
  
  if (a56Error) {
    console.log('❌ A56 NOT found in Supabase');
    console.log('   Error:', a56Error.message);
  } else {
    console.log('✅ A56 EXISTS in Supabase:');
    console.log('   ID:', a56.id);
    console.log('   Name:', a56.name);
    console.log('   Category ID:', a56.category_id);
    console.log('   Category Name:', a56.category_name);
    console.log('   Status:', a56.status);
    console.log('   Price:', a56.price);
    console.log('   Color:', a56.color);
  }
  
  // 2. Check all categories
  console.log('\n2️⃣ Checking categories...');
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('price', { ascending: false });
  
  if (categories) {
    console.log(`Found ${categories.length} categories:`);
    categories.forEach(cat => {
      console.log(`   ${cat.id} - ${cat.name} (${cat.prefix}1-${cat.prefix}${cat.count})`);
    });
    
    // Check if A56's category exists
    if (a56) {
      const a56Category = categories.find(c => c.id === a56.category_id);
      if (a56Category) {
        console.log(`\n✅ A56's category "${a56.category_name}" exists`);
      } else {
        console.log(`\n❌ A56's category "${a56.category_id}" NOT FOUND in categories table!`);
        console.log('   This is why A56 is not showing - its category is missing!');
      }
    }
  }
  
  // 3. Check all A-prefix rooms
  console.log('\n3️⃣ Checking all A-prefix rooms...');
  const { data: aRooms } = await supabase
    .from('rooms')
    .select('id, name, category_name, status')
    .like('id', 'A%')
    .order('id');
  
  if (aRooms) {
    console.log(`Found ${aRooms.length} A-prefix rooms:`);
    aRooms.forEach(room => {
      const marker = room.id === 'A56' ? ' ← THIS ONE' : '';
      console.log(`   ${room.id} - ${room.category_name} - ${room.status}${marker}`);
    });
    
    // Check if A56 is beyond the expected range
    if (aRooms.length > 8) {
      console.log(`\n⚠️  WARNING: Found ${aRooms.length} A-prefix rooms, but only 8 are expected (A1-A8)`);
      const extraRooms = aRooms.filter(r => {
        const num = parseInt(r.id.substring(1));
        return num > 8;
      });
      if (extraRooms.length > 0) {
        console.log('   Extra rooms that should not exist:');
        extraRooms.forEach(r => console.log(`     - ${r.id}`));
      }
    }
  }
  
  // 4. Check if there are any bookings for A56
  console.log('\n4️⃣ Checking bookings for A56...');
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, guest_name, status, check_in_date, check_out_date')
    .eq('room_id', 'A56')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (bookings && bookings.length > 0) {
    console.log(`Found ${bookings.length} bookings for A56:`);
    bookings.forEach(b => {
      console.log(`   ${b.guest_name} - ${b.status} (${b.check_in_date?.split('T')[0]} to ${b.check_out_date?.split('T')[0]})`);
    });
  } else {
    console.log('No bookings found for A56');
  }
  
  // 5. Summary and recommendations
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY & RECOMMENDATIONS\n');
  
  if (!a56) {
    console.log('❌ A56 does not exist in Supabase');
    console.log('   → This is correct. Presidential rooms should only be A1-A8.');
    console.log('   → If you see A56 in the website, clear your browser cache.');
  } else {
    console.log('✅ A56 exists in Supabase');
    
    const a56Category = categories?.find(c => c.id === a56.category_id);
    if (!a56Category) {
      console.log('❌ A56\'s category is missing from categories table');
      console.log('   → FIX: Delete A56 or fix its category_id');
      console.log('   → SQL: DELETE FROM rooms WHERE id = \'A56\';');
    } else {
      console.log('✅ A56\'s category exists');
      console.log('   → A56 should be visible in the admin dashboard');
      console.log('   → If not visible, check:');
      console.log('     1. Browser console for errors');
      console.log('     2. Active tab filter (must be "All" or "Presidential")');
      console.log('     3. Status filter (must be "All" or match A56\'s status)');
      console.log('     4. Search box (must be empty or contain "A56")');
    }
    
    const num = parseInt(a56.id.substring(1));
    if (num > 8) {
      console.log('\n⚠️  A56 is beyond the expected range (A1-A8)');
      console.log('   → RECOMMENDATION: Delete A56 as it should not exist');
      console.log('   → SQL: DELETE FROM rooms WHERE id = \'A56\';');
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

diagnoseA56();
