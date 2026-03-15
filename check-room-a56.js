import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkRoomA56() {
  console.log('🔍 Checking for room A56...\n');
  
  // Check in Supabase
  console.log('📊 SUPABASE:');
  const { data: supabaseRooms, error } = await supabase
    .from('rooms')
    .select('*')
    .or('id.eq.A56,name.eq.A56');
  
  if (error) {
    console.error('❌ Supabase error:', error);
  } else if (supabaseRooms && supabaseRooms.length > 0) {
    console.log('✅ Found in Supabase:');
    supabaseRooms.forEach(room => {
      console.log(`   ID: ${room.id}`);
      console.log(`   Name: ${room.name}`);
      console.log(`   Category: ${room.category_name}`);
      console.log(`   Status: ${room.status}`);
      console.log(`   Price: ${room.price}`);
    });
  } else {
    console.log('❌ NOT found in Supabase');
  }
  
  console.log('\n📦 INDEXEDDB:');
  console.log('Cannot check IndexedDB from Node.js script.');
  console.log('To check IndexedDB:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Application tab');
  console.log('3. Expand IndexedDB → MironaDB → rooms');
  console.log('4. Look for room with id "A56"');
  
  // Check all A-prefix rooms
  console.log('\n📋 ALL A-PREFIX ROOMS IN SUPABASE:');
  const { data: aRooms } = await supabase
    .from('rooms')
    .select('id, name, category_name, status')
    .like('id', 'A%')
    .order('id');
  
  if (aRooms && aRooms.length > 0) {
    console.log(`Found ${aRooms.length} rooms with A prefix:`);
    aRooms.forEach(room => {
      console.log(`   ${room.id} - ${room.name} (${room.category_name}) - ${room.status}`);
    });
  } else {
    console.log('No A-prefix rooms found');
  }
  
  // Check if A56 is in any bookings
  console.log('\n🔖 BOOKINGS FOR ROOM A56:');
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, guest_name, status, check_in_date, check_out_date')
    .eq('room_id', 'A56')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (bookings && bookings.length > 0) {
    console.log(`Found ${bookings.length} bookings for A56:`);
    bookings.forEach(b => {
      console.log(`   ${b.guest_name} - ${b.status} (${b.check_in_date} to ${b.check_out_date})`);
    });
  } else {
    console.log('No bookings found for A56');
  }
}

checkRoomA56();
