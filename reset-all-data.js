// COMPLETE DATA RESET - Use with caution!
// This script clears ALL data from Supabase and IndexedDB

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wyelzqqqmrkwqtduqamf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWx6cXFxbXJrd3F0ZHVxYW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NzI5NzcsImV4cCI6MjA1MjM0ODk3N30.sBxLxiJhസസ്സിംഗ്ലിഷ്';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function resetAllData() {
    console.log('🚨 STARTING COMPLETE DATA RESET...\n');
    
    const confirm = prompt('⚠️  This will DELETE ALL DATA. Type "DELETE EVERYTHING" to confirm:');
    if (confirm !== 'DELETE EVERYTHING') {
        console.log('❌ Reset cancelled.');
        return;
    }

    try {
        // 1. Clear Supabase tables
        console.log('🗑️  Clearing Supabase tables...');
        
        await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('✅ Bookings cleared');
        
        await supabase.from('guests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('✅ Guests cleared');
        
        await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('✅ Expenses cleared');
        
        await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('✅ Audit logs cleared');
        
        await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('✅ Notifications cleared');

        // Note: We DON'T clear rooms, room_categories, services, users, or settings
        // as those are configuration data, not transactional data
        
        console.log('\n✅ Supabase data cleared successfully!');
        console.log('\n📝 Note: Rooms, categories, services, users, and settings were preserved.');
        console.log('\n🔄 Now clear IndexedDB by:');
        console.log('   1. Open browser DevTools (F12)');
        console.log('   2. Go to Application > Storage > IndexedDB');
        console.log('   3. Right-click "MironaHotelDB" > Delete database');
        console.log('   4. Refresh the page');
        console.log('\n✨ System will be fresh and ready!');
        
    } catch (error) {
        console.error('❌ Error during reset:', error);
    }
}

resetAllData();
