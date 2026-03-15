import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wyelzqqqmrkwqtduqamf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWx6cXFxbXJrd3F0ZHVxYW1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE3NTU5NywiZXhwIjoyMDUxNzUxNTk3fQ.Ql_Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5Ql5';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createGuestsFromBookings() {
    console.log('🔄 Creating guests from existing bookings...\n');
    
    // 1. Fetch all bookings
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');
    
    if (bookingsError) {
        console.error('❌ Error fetching bookings:', bookingsError);
        return;
    }
    
    console.log(`📋 Found ${bookings.length} bookings\n`);
    
    // 2. Group bookings by guest (phone, identification, or name)
    const guestMap = new Map();
    
    for (const booking of bookings) {
        if (!booking.guest_name) continue;
        
        // Create a unique key for the guest
        const guestKey = booking.phone || booking.identification || booking.guest_name.toLowerCase();
        
        if (!guestMap.has(guestKey)) {
            guestMap.set(guestKey, {
                id: booking.phone || booking.identification || `g-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                name: booking.guest_name,
                phone: booking.phone || '',
                email: booking.email || '',
                identification: booking.identification || '',
                identification_type: booking.identification_type || 'National ID',
                bookings: []
            });
        }
        
        guestMap.get(guestKey).bookings.push(booking);
    }
    
    console.log(`👥 Found ${guestMap.size} unique guests\n`);
    
    // 3. Create guest records with calculated stats
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const [key, guestData] of guestMap.entries()) {
        const activeBookings = guestData.bookings.filter(b => b.status !== 'CANCELLED');
        const totalSpent = activeBookings.reduce((sum, b) => sum + (b.paid_amount || b.amount || 0), 0);
        const visits = activeBookings.length;
        const lastVisit = activeBookings.length > 0
            ? activeBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : new Date().toISOString();
        
        const guest = {
            id: guestData.id,
            name: guestData.name,
            phone: guestData.phone,
            email: guestData.email,
            identification: guestData.identification,
            identification_type: guestData.identification_type,
            visits: visits,
            total_spent: totalSpent,
            last_visit: lastVisit,
            is_vip: totalSpent > 1000000
        };
        
        try {
            const { data, error } = await supabase
                .from('guests')
                .upsert(guest, { onConflict: 'id' })
                .select()
                .single();
            
            if (error) throw error;
            
            console.log(`✅ ${guest.name} - Visits: ${visits}, Spent: ${totalSpent}`);
            created++;
        } catch (error) {
            console.error(`❌ Failed to create guest ${guestData.name}:`, error.message);
            errors++;
        }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Created/Updated: ${created}`);
    console.log(`   ❌ Errors: ${errors}`);
}

createGuestsFromBookings().catch(console.error);
