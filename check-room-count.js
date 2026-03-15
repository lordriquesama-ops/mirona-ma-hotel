import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkRoomCount() {
  console.log('🔍 Checking Room Count Mismatch\n');
  console.log('=' .repeat(60));
  
  // 1. Check categories table
  console.log('\n1️⃣ CATEGORIES TABLE (Expected Counts):');
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('price', { ascending: false });
  
  let expectedTotal = 0;
  if (categories) {
    categories.forEach(cat => {
      console.log(`   ${cat.name} (${cat.prefix}): ${cat.count} rooms`);
      expectedTotal += cat.count;
    });
    console.log(`   ─────────────────────────────`);
    console.log(`   TOTAL EXPECTED: ${expectedTotal} rooms`);
  }
  
  // 2. Check actual rooms in database
  console.log('\n2️⃣ ROOMS TABLE (Actual Rooms):');
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, category_name, status');
  
  if (rooms) {
    console.log(`   Total rooms in database: ${rooms.length}`);
    
    // Group by category
    const byCategory = {};
    rooms.forEach(r => {
      if (!byCategory[r.category_name]) {
        byCategory[r.category_name] = [];
      }
      byCategory[r.category_name].push(r);
    });
    
    console.log('\n   Breakdown by category:');
    Object.keys(byCategory).forEach(catName => {
      const roomList = byCategory[catName];
      console.log(`   ${catName}: ${roomList.length} rooms`);
      console.log(`      Rooms: ${roomList.map(r => r.id).join(', ')}`);
    });
    
    // Check status distribution
    console.log('\n   Status distribution:');
    const byStatus = {};
    rooms.forEach(r => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    Object.keys(byStatus).forEach(status => {
      console.log(`   ${status}: ${byStatus[status]}`);
    });
  }
  
  // 3. Compare
  console.log('\n3️⃣ COMPARISON:');
  if (categories && rooms) {
    const diff = expectedTotal - rooms.length;
    if (diff === 0) {
      console.log(`   ✅ MATCH: Categories expect ${expectedTotal}, database has ${rooms.length}`);
    } else if (diff > 0) {
      console.log(`   ❌ MISMATCH: Categories expect ${expectedTotal}, but only ${rooms.length} exist`);
      console.log(`   Missing ${diff} rooms!`);
    } else {
      console.log(`   ⚠️  MISMATCH: Categories expect ${expectedTotal}, but ${rooms.length} exist`);
      console.log(`   ${Math.abs(diff)} extra rooms!`);
    }
  }
  
  // 4. Recommendations
  console.log('\n4️⃣ RECOMMENDATIONS:');
  if (categories && rooms && expectedTotal !== rooms.length) {
    console.log('\n   Option A: Update category counts to match actual rooms');
    console.log('   ─────────────────────────────────────────────────────');
    categories.forEach(cat => {
      const actualCount = rooms.filter(r => r.category_name === cat.name).length;
      if (actualCount !== cat.count) {
        console.log(`   UPDATE categories SET count = ${actualCount} WHERE id = '${cat.id}';`);
      }
    });
    
    console.log('\n   Option B: Create missing rooms to match category counts');
    console.log('   ─────────────────────────────────────────────────────');
    console.log('   Run: node sync-rooms-to-supabase.js');
    
    console.log('\n   Option C: Delete extra rooms');
    console.log('   ─────────────────────────────────────────────────────');
    const extraRooms = [];
    categories.forEach(cat => {
      const catRooms = rooms.filter(r => r.category_name === cat.name);
      if (catRooms.length > cat.count) {
        const extras = catRooms.slice(cat.count);
        extraRooms.push(...extras);
      }
    });
    if (extraRooms.length > 0) {
      console.log('   Extra rooms to delete:');
      extraRooms.forEach(r => {
        console.log(`   DELETE FROM rooms WHERE id = '${r.id}'; -- ${r.name}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

checkRoomCount();
