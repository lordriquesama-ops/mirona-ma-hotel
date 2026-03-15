/**
 * Diagnose Guest Creation Issues
 * 
 * Run this in browser console to check why guests aren't being created
 * 
 * Usage:
 * 1. Open your app in browser
 * 2. Open console (F12)
 * 3. Copy and paste this script
 * 4. Press Enter
 */

(async function diagnoseGuestCreation() {
    console.log('🔍 Diagnosing Guest Creation...');
    console.log('');

    try {
        // Import required modules
        const { getBookings, getGuests } = await import('./services/db.js');
        const { supabaseAdapter } = await import('./services/supabase-adapter.js');
        const { USE_SUPABASE } = await import('./services/config.js');

        console.log('✅ Modules loaded');
        console.log(`   USE_SUPABASE: ${USE_SUPABASE}`);
        console.log('');

        // 1. Check Bookings
        console.log('📦 Checking Bookings...');
        const bookings = await getBookings();
        console.log(`   Total bookings: ${bookings.length}`);
        
        const validBookings = bookings.filter(b => b.status !== 'CANCELLED');
        console.log(`   Valid bookings: ${validBookings.length}`);
        
        const bookingsWithGuests = validBookings.filter(b => b.guestName);
        console.log(`   Bookings with guest names: ${bookingsWithGuests.length}`);
        console.log('');

        // Show sample bookings
        if (bookingsWithGuests.length > 0) {
            console.log('   Sample bookings:');
            bookingsWithGuests.slice(0, 3).forEach(b => {
                console.log(`   - ${b.guestName} (${b.status})`);
                console.log(`     Phone: ${b.phone || 'N/A'}`);
                console.log(`     ID: ${b.identification || 'N/A'}`);
                console.log(`     Amount: ${b.amount}`);
            });
            console.log('');
        }

        // 2. Check Guests in IndexedDB
        console.log('📦 Checking Guests in IndexedDB...');
        const DB_NAME = 'MironaDB';
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const localGuests = await new Promise((resolve) => {
            const tx = db.transaction('guests', 'readonly');
            const req = tx.objectStore('guests').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });

        console.log(`   Guests in IndexedDB: ${localGuests.length}`);
        if (localGuests.length > 0) {
            console.log('   Sample guests:');
            localGuests.slice(0, 3).forEach(g => {
                console.log(`   - ${g.name} (${g.phone || g.id})`);
                console.log(`     Visits: ${g.visits}, Spent: ${g.totalSpent}`);
            });
        }
        console.log('');

        // 3. Check Guests in Supabase
        if (USE_SUPABASE) {
            console.log('📦 Checking Guests in Supabase...');
            try {
                const supabaseGuests = await supabaseAdapter.getGuests();
                console.log(`   Guests in Supabase: ${supabaseGuests.length}`);
                
                if (supabaseGuests.length > 0) {
                    console.log('   Sample guests:');
                    supabaseGuests.slice(0, 3).forEach(g => {
                        console.log(`   - ${g.name} (${g.phone || g.id})`);
                        console.log(`     Visits: ${g.visits}, Spent: ${g.totalSpent}`);
                    });
                } else {
                    console.warn('   ⚠️ No guests in Supabase!');
                }
                console.log('');
            } catch (error) {
                console.error('   ❌ Failed to fetch from Supabase:', error.message);
                console.log('');
            }
        }

        // 4. Test Guest Creation
        console.log('🧪 Testing Guest Creation...');
        if (bookingsWithGuests.length > 0) {
            const testBooking = bookingsWithGuests[0];
            console.log(`   Testing with booking: ${testBooking.guestName}`);
            
            try {
                // Try to create guest manually
                const testGuest = {
                    id: testBooking.phone || testBooking.identification || `test-${Date.now()}`,
                    name: testBooking.guestName,
                    phone: testBooking.phone || '',
                    email: testBooking.email || '',
                    identification: testBooking.identification || '',
                    identificationType: testBooking.identificationType || 'National ID',
                    visits: 1,
                    totalSpent: testBooking.amount || 0,
                    lastVisit: new Date().toISOString(),
                    isVip: false
                };

                console.log('   Attempting to save guest to Supabase...');
                const savedGuest = await supabaseAdapter.upsertGuest(testGuest);
                console.log('   ✅ Guest saved successfully!');
                console.log('   Guest ID:', savedGuest.id);
                console.log('');
            } catch (error) {
                console.error('   ❌ Failed to save guest:', error.message);
                console.error('   Full error:', error);
                console.log('');
                
                // Check if it's a schema issue
                if (error.message.includes('uuid') || error.message.includes('UUID')) {
                    console.error('   🚨 UUID ERROR DETECTED!');
                    console.error('   You need to run PRODUCTION_SAFE_MIGRATION.sql first!');
                    console.error('   This converts guest ID from UUID to TEXT.');
                } else if (error.message.includes('foreign key') || error.message.includes('constraint')) {
                    console.error('   🚨 FOREIGN KEY ERROR!');
                    console.error('   Check that the guests table exists in Supabase.');
                } else if (error.message.includes('permission') || error.message.includes('policy')) {
                    console.error('   🚨 PERMISSION ERROR!');
                    console.error('   Check RLS policies on guests table.');
                }
            }
        }

        // 5. Summary
        console.log('═══════════════════════════════════════════');
        console.log('📊 DIAGNOSIS SUMMARY');
        console.log('═══════════════════════════════════════════');
        console.log(`Bookings: ${bookings.length} total, ${bookingsWithGuests.length} with guests`);
        console.log(`IndexedDB Guests: ${localGuests.length}`);
        if (USE_SUPABASE) {
            try {
                const supabaseGuests = await supabaseAdapter.getGuests();
                console.log(`Supabase Guests: ${supabaseGuests.length}`);
                
                if (bookingsWithGuests.length > 0 && supabaseGuests.length === 0) {
                    console.log('');
                    console.log('🚨 ISSUE FOUND:');
                    console.log('   You have bookings but no guests in Supabase!');
                    console.log('');
                    console.log('💡 LIKELY CAUSES:');
                    console.log('   1. Migration not run (UUID vs TEXT issue)');
                    console.log('   2. Guest creation failing silently');
                    console.log('   3. RLS policies blocking inserts');
                    console.log('');
                    console.log('🔧 SOLUTIONS:');
                    console.log('   1. Run PRODUCTION_SAFE_MIGRATION.sql in Supabase');
                    console.log('   2. Check console for guest creation errors');
                    console.log('   3. Manually trigger guest creation by editing a booking');
                }
            } catch (error) {
                console.log(`Supabase Guests: ERROR - ${error.message}`);
            }
        }
        console.log('═══════════════════════════════════════════');

        db.close();
    } catch (error) {
        console.error('❌ Diagnosis failed:', error);
    }
})();
