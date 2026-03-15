/**
 * Migrate IndexedDB Data to Supabase
 * 
 * IMPORTANT: Run PRODUCTION_SAFE_MIGRATION.sql FIRST!
 * This script only works after the database schema is fixed.
 * 
 * Usage:
 * 1. Run PRODUCTION_SAFE_MIGRATION.sql in Supabase
 * 2. Open your app in browser
 * 3. Open browser console (F12)
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 6. Wait for completion message
 */

(async function migrateIndexedDBToSupabase() {
    console.log('🚀 Starting IndexedDB → Supabase migration...');
    console.log('');

    // Check if Supabase is enabled
    const { USE_SUPABASE } = await import('./services/config.js');
    if (!USE_SUPABASE) {
        console.error('❌ Supabase is disabled! Enable it first.');
        return;
    }

    // Import required modules
    const { supabaseAdapter } = await import('./services/supabase-adapter.js');
    
    // Open IndexedDB
    const DB_NAME = 'MironaDB';
    const DB_VERSION = 19;
    
    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    console.log('✅ Connected to IndexedDB');
    console.log('');

    // Helper function to get all records from a store
    const getAllFromStore = (storeName) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    };

    let totalMigrated = 0;
    let totalErrors = 0;

    // ============================================
    // MIGRATE ROOMS
    // ============================================
    console.log('📦 Migrating Rooms...');
    try {
        const rooms = await getAllFromStore('rooms');
        console.log(`   Found ${rooms.length} rooms in IndexedDB`);
        
        for (const room of rooms) {
            try {
                // Check if room already exists in Supabase
                const existingRooms = await supabaseAdapter.getRooms();
                const exists = existingRooms.find(r => r.id === room.id);
                
                if (exists) {
                    console.log(`   ⏭️  Room ${room.id} already exists, skipping`);
                } else {
                    await supabaseAdapter.addRoom(room);
                    console.log(`   ✅ Migrated room: ${room.id}`);
                    totalMigrated++;
                }
            } catch (error) {
                console.error(`   ❌ Failed to migrate room ${room.id}:`, error.message);
                totalErrors++;
            }
        }
    } catch (error) {
        console.error('❌ Failed to read rooms from IndexedDB:', error);
    }
    console.log('');

    // ============================================
    // MIGRATE GUESTS
    // ============================================
    console.log('📦 Migrating Guests...');
    try {
        const guests = await getAllFromStore('guests');
        console.log(`   Found ${guests.length} guests in IndexedDB`);
        
        for (const guest of guests) {
            try {
                // Check if guest already exists in Supabase
                const existingGuests = await supabaseAdapter.getGuests();
                const exists = existingGuests.find(g => g.id === guest.id);
                
                if (exists) {
                    console.log(`   ⏭️  Guest ${guest.name} already exists, skipping`);
                } else {
                    await supabaseAdapter.upsertGuest(guest);
                    console.log(`   ✅ Migrated guest: ${guest.name}`);
                    totalMigrated++;
                }
            } catch (error) {
                console.error(`   ❌ Failed to migrate guest ${guest.name}:`, error.message);
                totalErrors++;
            }
        }
    } catch (error) {
        console.error('❌ Failed to read guests from IndexedDB:', error);
    }
    console.log('');

    // ============================================
    // MIGRATE SERVICES
    // ============================================
    console.log('📦 Migrating Services...');
    try {
        const services = await getAllFromStore('services_catalog');
        console.log(`   Found ${services.length} services in IndexedDB`);
        
        for (const service of services) {
            try {
                // Check if service already exists in Supabase
                const existingServices = await supabaseAdapter.getServices();
                const exists = existingServices.find(s => s.id === service.id);
                
                if (exists) {
                    console.log(`   ⏭️  Service ${service.name} already exists, skipping`);
                } else {
                    await supabaseAdapter.addService(service);
                    console.log(`   ✅ Migrated service: ${service.name}`);
                    totalMigrated++;
                }
            } catch (error) {
                console.error(`   ❌ Failed to migrate service ${service.name}:`, error.message);
                totalErrors++;
            }
        }
    } catch (error) {
        console.error('❌ Failed to read services from IndexedDB:', error);
    }
    console.log('');

    // ============================================
    // MIGRATE BOOKINGS
    // ============================================
    console.log('📦 Migrating Bookings...');
    try {
        const bookings = await getAllFromStore('bookings');
        console.log(`   Found ${bookings.length} bookings in IndexedDB`);
        
        for (const booking of bookings) {
            try {
                // Check if booking already exists in Supabase
                const existingBookings = await supabaseAdapter.getBookings();
                const exists = existingBookings.find(b => 
                    b.guestName === booking.guestName && 
                    b.checkIn === booking.checkIn &&
                    b.roomNumber === booking.roomNumber
                );
                
                if (exists) {
                    console.log(`   ⏭️  Booking for ${booking.guestName} already exists, skipping`);
                } else {
                    // Create new booking (let Supabase generate UUID)
                    const newBooking = { ...booking, id: 'NEW' };
                    await supabaseAdapter.saveBooking(newBooking);
                    console.log(`   ✅ Migrated booking: ${booking.guestName}`);
                    totalMigrated++;
                }
            } catch (error) {
                console.error(`   ❌ Failed to migrate booking for ${booking.guestName}:`, error.message);
                totalErrors++;
            }
        }
    } catch (error) {
        console.error('❌ Failed to read bookings from IndexedDB:', error);
    }
    console.log('');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('═══════════════════════════════════════════');
    console.log('🎉 MIGRATION COMPLETED!');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log(`✅ Successfully migrated: ${totalMigrated} records`);
    console.log(`❌ Failed to migrate: ${totalErrors} records`);
    console.log('');
    
    if (totalErrors === 0) {
        console.log('🎊 Perfect! All data migrated successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Refresh the page (F5)');
        console.log('2. Verify data in Supabase dashboard');
        console.log('3. Check that all features work correctly');
    } else {
        console.log('⚠️  Some records failed to migrate.');
        console.log('Check the errors above for details.');
        console.log('');
        console.log('Common issues:');
        console.log('- Schema migration not run yet');
        console.log('- Duplicate data already in Supabase');
        console.log('- Invalid data format');
    }
    console.log('');
    console.log('═══════════════════════════════════════════');

    db.close();
})();
