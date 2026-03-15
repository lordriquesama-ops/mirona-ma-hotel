/**
 * Diagnose Dashboard Graph Data
 * 
 * Run this in browser console to see why the graph is flat
 * 
 * Usage:
 * 1. Open Dashboard
 * 2. Open console (F12)
 * 3. Copy and paste this script
 * 4. Press Enter
 */

(async function diagnoseDashboardGraph() {
    console.log('📊 Diagnosing Dashboard Graph...');
    console.log('');

    try {
        const { getBookings, getSettings } = await import('./services/db.js');
        const { getTaxBreakdown } = await import('./utils/finance.js');

        const bookings = await getBookings();
        const settings = await getSettings();
        const taxRate = settings.taxRate || 0;

        console.log(`✅ Found ${bookings.length} total bookings`);
        console.log('');

        // Filter for revenue-active bookings
        const revenueBookings = bookings.filter(b => 
            (b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT') && 
            (b.paidAmount || 0) > 0
        );

        console.log(`💰 Revenue-active bookings: ${revenueBookings.length}`);
        console.log('');

        if (revenueBookings.length === 0) {
            console.warn('⚠️ NO REVENUE-ACTIVE BOOKINGS FOUND!');
            console.log('');
            console.log('Reasons why graph might be flat:');
            console.log('1. No bookings with status CHECKED_IN or CHECKED_OUT');
            console.log('2. No bookings with paidAmount > 0');
            console.log('');
            
            // Show booking statuses
            const statusCounts = {};
            bookings.forEach(b => {
                statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
            });
            
            console.log('📋 Booking Status Breakdown:');
            Object.keys(statusCounts).forEach(status => {
                console.log(`   ${status}: ${statusCounts[status]}`);
            });
            console.log('');
            
            // Check paid amounts
            const paidBookings = bookings.filter(b => (b.paidAmount || 0) > 0);
            console.log(`💵 Bookings with payment: ${paidBookings.length}`);
            console.log('');
            
            return;
        }

        // Analyze last 7 days
        console.log('📅 Last 7 Days Analysis:');
        console.log('');

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-GB', {weekday:'short'});
            
            let dayRev = 0;
            let dayCount = 0;

            revenueBookings.forEach(b => {
                const totalPaid = b.paidAmount || 0;
                const totalGross = getTaxBreakdown(b.amount, taxRate).grandTotal;
                const paymentRatio = totalGross > 0 ? totalPaid / totalGross : (totalPaid > 0 ? 1 : 0);

                // Check if revenue applies to this date
                if (b.checkIn === dateStr) {
                    const chargesTotal = b.charges ? b.charges.reduce((sum, c) => sum + c.amount, 0) : 0;
                    const roomRev = (b.amount - chargesTotal) * paymentRatio;
                    dayRev += roomRev;
                    dayCount++;
                    console.log(`   ${dayName} (${dateStr}): ${b.guestName} - ${roomRev.toFixed(2)}`);
                }

                if (b.charges) {
                    b.charges.forEach(c => {
                        const cDate = c.date || b.checkIn || '';
                        if (cDate === dateStr) {
                            const chargeRev = c.amount * paymentRatio;
                            dayRev += chargeRev;
                            console.log(`   ${dayName} (${dateStr}): ${b.guestName} (charge) - ${chargeRev.toFixed(2)}`);
                        }
                    });
                }
            });

            const grossRev = getTaxBreakdown(dayRev, taxRate).grandTotal;
            
            if (dayCount > 0 || dayRev > 0) {
                console.log(`   ${dayName} (${dateStr}): Total = ${grossRev.toFixed(2)} (${dayCount} bookings)`);
            } else {
                console.log(`   ${dayName} (${dateStr}): No revenue`);
            }
        }

        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('📊 DIAGNOSIS COMPLETE');
        console.log('═══════════════════════════════════════════');
        console.log('');

        // Show sample booking details
        if (revenueBookings.length > 0) {
            console.log('Sample Revenue Booking:');
            const sample = revenueBookings[0];
            console.log(`   Guest: ${sample.guestName}`);
            console.log(`   Status: ${sample.status}`);
            console.log(`   Check-in: ${sample.checkIn}`);
            console.log(`   Check-out: ${sample.checkOut}`);
            console.log(`   Amount: ${sample.amount}`);
            console.log(`   Paid: ${sample.paidAmount || 0}`);
            console.log(`   Charges: ${sample.charges ? sample.charges.length : 0}`);
            console.log('');
        }

        // Check if check-in dates are in last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const bookingsInRange = revenueBookings.filter(b => 
            last7Days.includes(b.checkIn)
        );

        console.log(`📅 Bookings with check-in in last 7 days: ${bookingsInRange.length}`);
        
        if (bookingsInRange.length === 0) {
            console.warn('⚠️ All check-in dates are OUTSIDE the last 7 days!');
            console.log('');
            console.log('Check-in dates of revenue bookings:');
            revenueBookings.forEach(b => {
                console.log(`   ${b.guestName}: ${b.checkIn}`);
            });
        }

        console.log('');
        console.log('💡 RECOMMENDATIONS:');
        if (revenueBookings.length === 0) {
            console.log('   1. Check in some guests');
            console.log('   2. Set paidAmount > 0');
            console.log('   3. Refresh dashboard');
        } else if (bookingsInRange.length === 0) {
            console.log('   1. Your bookings are too old (check-in > 7 days ago)');
            console.log('   2. Create new bookings with recent check-in dates');
            console.log('   3. Or check Reports page for full date range');
        } else {
            console.log('   ✅ Data looks good! Graph should be showing.');
            console.log('   Try refreshing the page (F5)');
        }

    } catch (error) {
        console.error('❌ Diagnosis failed:', error);
    }
})();
