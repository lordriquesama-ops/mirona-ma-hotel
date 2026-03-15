import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Default room configuration
const SAFARI_ROOM_NAMES = [
    'Lion', 'Elephant', 'Leopard', 'Buffalo', 'Rhino', 
    'Zebra', 'Giraffe', 'Cheetah', 'Hippo', 'Gorilla', 
    'Eagle', 'Crane', 'Kingfisher', 'Weaver', 'Turaco'
];

const DEFAULT_CATEGORIES = [
  { id: 'platinum', name: 'Presidential', price: 50000, prefix: 'A', count: 8, color: 'bg-slate-800' },
  { id: 'gold', name: 'Suites', price: 30000, prefix: 'B', count: 12, color: 'bg-amber-700' },
  { id: 'silver', name: 'Deluxe', price: 20000, prefix: 'C', count: 10, color: 'bg-gray-500' },
  { id: 'safari', name: 'Safari', price: 10000, prefix: 'D', count: 8, color: 'bg-green-700' }
];

async function syncRoomsToSupabase() {
  console.log('🔄 Syncing rooms to Supabase...\n');
  
  // Check what's currently in Supabase
  const { data: existingRooms, error: fetchError } = await supabase
    .from('rooms')
    .select('id, name');
  
  if (fetchError) {
    console.error('❌ Error fetching rooms:', fetchError);
    return;
  }
  
  console.log(`📊 Currently in Supabase: ${existingRooms.length} rooms`);
  
  // Generate all rooms that should exist
  const roomsToCreate = [];
  
  for (const cat of DEFAULT_CATEGORIES) {
    for (let i = 1; i <= cat.count; i++) {
      let roomNum = `${cat.prefix}${i}`;
      if (cat.id === 'safari' && SAFARI_ROOM_NAMES[i-1]) {
        roomNum = SAFARI_ROOM_NAMES[i-1];
      }
      
      // Check if room already exists
      const exists = existingRooms.find(r => r.id === roomNum);
      if (!exists) {
        roomsToCreate.push({
          id: roomNum,
          name: roomNum,
          category_id: cat.id,
          category_name: cat.name,
          price: cat.price,
          status: 'Available',
          color: cat.color,
          floor: null,
          notes: null
        });
      }
    }
  }
  
  if (roomsToCreate.length === 0) {
    console.log('✅ All rooms already exist in Supabase');
    return;
  }
  
  console.log(`\n📝 Creating ${roomsToCreate.length} missing rooms:`);
  roomsToCreate.forEach(r => console.log(`   ${r.id} - ${r.category_name}`));
  
  // Insert rooms in batches
  const batchSize = 10;
  for (let i = 0; i < roomsToCreate.length; i += batchSize) {
    const batch = roomsToCreate.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('rooms')
      .insert(batch);
    
    if (insertError) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError);
    } else {
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} rooms)`);
    }
  }
  
  // Verify final count
  const { data: finalRooms } = await supabase
    .from('rooms')
    .select('id');
  
  console.log(`\n✅ Total rooms in Supabase: ${finalRooms.length}`);
  console.log('\n🎉 Sync complete!');
  console.log('\nExpected room counts:');
  console.log('  Presidential (A): 8 rooms (A1-A8)');
  console.log('  Suites (B): 12 rooms (B1-B12)');
  console.log('  Deluxe (C): 10 rooms (C1-C10)');
  console.log('  Safari: 8 rooms (Lion, Elephant, etc.)');
  console.log('  TOTAL: 38 rooms');
}

syncRoomsToSupabase();
