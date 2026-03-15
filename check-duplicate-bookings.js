import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate booking IDs...\n');
  
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, guest_name, created_at')
    .order('id');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  // Group by ID
  const idCounts = {};
  bookings.forEach(b => {
    if (!idCounts[b.id]) {
      idCounts[b.id] = [];
    }
    idCounts[b.id].push(b);
  });
  
  // Find duplicates
  const duplicates = Object.entries(idCounts).filter(([id, records]) => records.length > 1);
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate booking IDs found');
  } else {
    console.log(`❌ Found ${duplicates.length} duplicate booking IDs:\n`);
    duplicates.forEach(([id, records]) => {
      console.log(`ID: ${id} (${records.length} copies)`);
      records.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.guest_name} - ${r.created_at}`);
      });
      console.log('');
    });
  }
  
  console.log(`\nTotal bookings: ${bookings.length}`);
}

checkDuplicates();
