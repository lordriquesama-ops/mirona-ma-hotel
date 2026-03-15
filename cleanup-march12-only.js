// Script to delete all data NOT created on March 12, 2026
// Run this to keep only data from March 12, 2026

import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your actual Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
    console.error('❌ Please set VITE_SUPABASE_URL environment variable or edit this file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_DATE = '2026-03-12';

async function cleanupOldData() {
    console.log('🧹 Starting data cleanup...');
    console.log(`📅 Keeping only data from: ${TARGET_DATE}`);
    console.log('');

    try {
        // 1. Delete bookings NOT from March 12, 2026
        console.log('🗑️  Deleting bookings not from March 12...');
        const { data: bookingsToDelete, error: bookingsFetchError } = await supabase
            .from('bookings')
            .select('id, date, guest_name')
            .not('date', 'like', `${TARGET_DATE}%`);

        if (bookingsFetchError) {
            console.error('❌ Error fetching bookings:', bookingsFetchError);
        } else if (bookingsToDelete && bookingsToDelete.length > 0) {
            console.log(`   Found ${bookingsToDelete.length} bookings to delete`);
            
            const { error: deleteError } = await supabase
                .from('bookings')
                .delete()
                .not('date', 'like', `${TARGET_DATE}%`);

            if (deleteError) {
                console.error('❌ Error deleting bookings:', deleteError);
            } else {
                console.log(`   ✅ Deleted ${bookingsToDelete.length} old bookings`);
            }
        } else {
            console.log('   ℹ️  No old bookings to delete');
        }

        // 2. Delete expenses NOT from March 12, 2026
        console.log('');
        console.log('🗑️  Deleting expenses not from March 12...');
        const { data: expensesToDelete, error: expensesFetchError } = await supabase
            .from('expenses')
            .select('id, date, description')
            .neq('date', TARGET_DATE);

        if (expensesFetchError) {
            console.error('❌ Error fetching expenses:', expensesFetchError);
        } else if (expensesToDelete && expensesToDelete.length > 0) {
            console.log(`   Found ${expensesToDelete.length} expenses to delete`);
            
            const { error: deleteError } = await supabase
                .from('expenses')
                .delete()
                .neq('date', TARGET_DATE);

            if (deleteError) {
                console.error('❌ Error deleting expenses:', deleteError);
            } else {
                console.log(`   ✅ Deleted ${expensesToDelete.length} old expenses`);
            }
        } else {
            console.log('   ℹ️  No old expenses to delete');
        }

        // 3. Delete audit logs NOT from March 12, 2026
        console.log('');
        console.log('🗑️  Deleting audit logs not from March 12...');
        const { data: logsToDelete, error: logsFetchError } = await supabase
            .from('audit_logs')
            .select('id, timestamp')
            .not('timestamp', 'like', `${TARGET_DATE}%`);

        if (logsFetchError) {
            console.error('❌ Error fetching audit logs:', logsFetchError);
        } else if (logsToDelete && logsToDelete.length > 0) {
            console.log(`   Found ${logsToDelete.length} audit logs to delete`);
            
            const { error: deleteError } = await supabase
                .from('audit_logs')
                .delete()
                .not('timestamp', 'like', `${TARGET_DATE}%`);

            if (deleteError) {
                console.error('❌ Error deleting audit logs:', deleteError);
            } else {
                console.log(`   ✅ Deleted ${logsToDelete.length} old audit logs`);
            }
        } else {
            console.log('   ℹ️  No old audit logs to delete');
        }

        // 4. Clean up orphaned guests
        console.log('');
        console.log('🗑️  Cleaning up orphaned guests...');
        
        const { data: allGuests, error: guestsFetchError } = await supabase
            .from('guests')
            .select('id, name, phone');

        if (guestsFetchError) {
            console.error('❌ Error fetching guests:', guestsFetchError);
        } else if (allGuests) {
            const { data: march12Bookings } = await supabase
                .from('bookings')
                .select('guest_name, phone, identification')
                .like('date', `${TARGET_DATE}%`);

            const validGuestIdentifiers = new Set();
            if (march12Bookings) {
                march12Bookings.forEach(b => {
                    if (b.phone) validGuestIdentifiers.add(b.phone);
                    if (b.identification) validGuestIdentifiers.add(b.identification);
                    if (b.guest_name) validGuestIdentifiers.add(b.guest_name.toLowerCase());
                });
            }

            const orphanedGuests = allGuests.filter(g => {
                const hasPhone = g.phone && validGuestIdentifiers.has(g.phone);
                const hasName = g.name && validGuestIdentifiers.has(g.name.toLowerCase());
                return !hasPhone && !hasName;
            });

            if (orphanedGuests.length > 0) {
                console.log(`   Found ${orphanedGuests.length} orphaned guests to delete`);
                
                for (const guest of orphanedGuests) {
                    const { error: deleteError } = await supabase
                        .from('guests')
                        .delete()
                        .eq('id', guest.id);

                    if (deleteError) {
                        console.error(`   ❌ Error deleting guest ${guest.name}:`, deleteError);
                    }
                }
                console.log(`   ✅ Deleted ${orphanedGuests.length} orphaned guests`);
            } else {
                console.log('   ℹ️  No orphaned guests to delete');
            }
        }

        // 5. Show remaining data summary
        console.log('');
        console.log('📊 Remaining data summary:');
        
        const { count: bookingsCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true });
        console.log(`   Bookings: ${bookingsCount || 0}`);

        const { count: guestsCount } = await supabase
            .from('guests')
            .select('*', { count: 'exact', head: true });
        console.log(`   Guests: ${guestsCount || 0}`);

        const { count: expensesCount } = await supabase
            .from('expenses')
            .select('*', { count: 'exact', head: true });
        console.log(`   Expenses: ${expensesCount || 0}`);

        const { count: logsCount } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true });
        console.log(`   Audit Logs: ${logsCount || 0}`);

        console.log('');
        console.log('✅ Cleanup completed successfully!');
        console.log(`📅 All data now reflects activity from ${TARGET_DATE}`);

    } catch (error) {
        console.error('❌ Unexpected error during cleanup:', error);
        process.exit(1);
    }
}

cleanupOldData();
