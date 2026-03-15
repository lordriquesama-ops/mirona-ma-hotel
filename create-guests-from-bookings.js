/**
 * Create Guests from Existing Bookings
 * 
 * This script reads all bookings and creates guest profiles for them
 * 
 * Usage:
 * 1. Make sure PRODUCTION_SAFE_MIGRATION.sql has been run
 * 2. Open your app in browser
 * 3. Open console (F12)
 * 4. Copy and paste this script
 * 5. Press Enter
 */

(async function createGuestsFromBookings() {
    console.log('👥 Creating guests from existing bookings...');
    console.log('');

    try {
        // Import required modules
        const { getBookings, upsertGuestFromBooking } = await import('./services/db.js');
        const { USE_SUPABASE } = await import('./services/config.js');

        if (!USE_SUPABASE) {
            console.error('❌ Supabase is disabled! Enable it first.');
            return;
        }

        console.log('✅ Modules loaded');
        console.log('');

        // Get all bookings
        console.log('📦 Fetching bookings...');
        const bookings = await getBookings();
        console.log(`   Found ${bookings.length} bookings`);
        console.log('');

        // Filter valid bookings
        const validBookings = bookings.filter(b => 
            b.guestName && b.status !== 'CANCELLED'
        );
        console.log(`   ${validBookings.length} valid bookings with guest names`);
        console.log('');

        if (validBookings.length === 0) {
            console.log('⚠️ No valid bookings found. Nothing to do.');
            return;
        }

        // Process each booking
        console.log('🔄 Creating guest profiles...');
        let created = 0;
        let updated = 0;
        let errors = 0;

        for (const booking of validBookings) {
            try {
                console.log(`   Processing: ${booking.guestName}`);
                await upsertGuestFromBooking(booking);
                
                // Check if it was a create or update (simple heuristic)
                if (booking.phone || booking.identification) {
                    created++;
                } else {
                    updated++;
                }
            } catch (error) {
                console.error(`   ❌ Failed for ${booking.guestName}:`, error.message);
                errors++;
            }
        }

        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('✅ GUEST CREATION COMPLETED!');
        console.log('═══════════════════════════════════════════');
        console.log(`   Processed: ${validBookings.length} bookings`);
        console.log(`   Created/Updated: ${created + updated} guests`);
        console.log(`   Errors: ${errors}`);
        console.log('');

        if (errors > 0) {
            console.warn('⚠️ Some guests failed to create.');
            console.warn('   Check the errors above for details.');
            console.warn('');
            console.warn('💡 Common issues:');
            console.warn('   - Migration not run (UUID vs TEXT)');
            console.warn('   - RLS policies blocking inserts');
            console.warn('   - Invalid data format');
        } else {
            console.log('🎉 All guests created successfully!');
            console.log('');
            console.log('Next steps:');
            console.log('1. Refresh the page (F5)');
            console.log('2. Open Guests directory');
            console.log('3. Verify all guests are there');
            console.log('4. Check Supabase dashboard');
        }
        console.log('═══════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Script failed:', error);
        console.error('');
        console.error('💡 Make sure:');
        console.error('   1. PRODUCTION_SAFE_MIGRATION.sql has been run');
        console.error('   2. Supabase is enabled (USE_SUPABASE = true)');
        console.error('   3. You have internet connection');
    }
})();
