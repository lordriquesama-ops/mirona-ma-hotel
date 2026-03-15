import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wyelzqqqmrkwqtduqamf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWx6cXFxbXJrd3F0ZHVxYW1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE3NTU5NywiZXhwIjoyMDUxNzUxNTk3fQ.Ql_Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('🔍 GUEST CREATION DIAGNOSIS\n');
    
    // 1. Check bookings
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');
    
    if (bookingsError) {
        console.error('❌ Error fetching bookings:', bookingsError);
        return;
    }
    
    console.log(`📋 Total Bookings: ${bookings.length}`);
    console.log(`   - With guest names: ${bookings.filter(b => b.guest_name).length}`);
    console.log(`   - With phone: ${bookings.filter(b => b.phone).length}`);
    console.log(`   - Checked In: ${bookings.filter(b => b.status === 'CHECKED_IN').length}`);
    console.log(`   - Checked Out: ${bookings.filter(b => b.status === 'CHECKED_OUT').length}\n`);
    
    // 2. Check guests
    const { data: guests, error: guestsError } = await supabase
        .from('guests')
        .select('*');
    
    if (guestsError) {
        console.error('❌ Error fetching guests:', guestsError);
        return;
    }
    
    console.log(`👥 Total Guests: ${guests.length}\n`);
    
    if (guests.length > 0) {
        console.log('Sample guests:');
        guests.slice(0, 5).forEach(g => {
            console.log(`   - ${g.name} (${g.phone}) - Visits: ${g.visits}, Spent: ${g.total_spent}`);
        });
    }
    
    // 3. Analyze the gap
    const uniqueGuestNames = new Set(bookings.filter(b => b.guest_name).map(b => b.guest_name));
    const uniquePhones = new Set(bookings.filter(b => b.phone).map(b => b.phone));
    
    console.log(`\n📊 ANALYSIS:`);
    console.log(`   - Unique guest names in bookings: ${uniqueGuestNames.size}`);
    console.log(`   - Unique phones in bookings: ${uniquePhones.size}`);
    console.log(`   - Guests in database: ${guests.length}`);
    console.log(`   - Missing guests: ${uniqueGuestNames.size - guests.length}\n`);
    
    // 4. Check if upsertGuestFromBooking would work
    console.log('🧪 TESTING GUEST CREATION LOGIC:\n');
    
    const sampleBooking = bookings.find(b => b.guest_name && b.phone);
    if (sampleBooking) {
        console.log(`Sample booking: ${sampleBooking.guest_name} (${sampleBooking.phone})`);
        console.log(`   - Should create guest with ID: ${sampleBooking.phone || sampleBooking.identification || 'g-timestamp'}`);
    }
}

diagnose().catch(console.error);
