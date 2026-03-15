import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixDuplicates() {
  console.log('🔍 Finding and fixing duplicate booking IDs...\n');
  
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  // Group by ID
  const idGroups = {};
  bookings.forEach(b => {
    if (!idGroups[b.id]) {
      idGroups[b.id] = [];
    }
    idGroups[b.id].push(b);
  });
  
  // Find duplicates
  const duplicates = Object.entries(idGroups).filter(([id, records]) => records.length > 1);
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate booking IDs found');
    return;
  }
  
  console.log(`❌ Found ${duplicates.length} duplicate booking IDs\n`);
  
  for (const [id, records] of duplicates) {
    console.log(`\nFixing ID: ${id} (${records.length} copies)`);
    
    // Keep the most recent one (last in array since we sorted by created_at ascending)
    const toKeep = records[records.length - 1];
    const toDelete = records.slice(0, -1);
    
    console.log(`  Keeping: ${toKeep.guest_name} - ${toKeep.created_at}`);
    console.log(`  Deleting ${toDelete.length} older copies...`);
    
    // Delete older duplicates one by one
    for (const booking of toDelete) {
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id)
        .eq('created_at', booking.created_at); // Use created_at to target specific row
      
      if (deleteError) {
        console.error(`    ❌ Failed to delete: ${deleteError.message}`);
      } else {
        console.log(`    ✅ Deleted duplicate from ${booking.created_at}`);
      }
    }
  }
  
  console.log('\n✅ Duplicate cleanup complete!');
}

fixDuplicates();
