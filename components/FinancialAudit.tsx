
import React, { useState, useEffect } from 'react';
import { getBookings, getRooms, getExpenses, getServices, getRoomCategories, getSettings } from '../services/db';
import { Booking, Room, ExpenseRecord, ServiceItem, RoomCategory, SystemSettings } from '../types';
import { AlertCircleIcon, CheckCircleIcon, AlertTriangleIcon, SearchIcon, RefreshCwIcon, DatabaseIcon } from './Icons';
import { getTaxBreakdown } from '../utils/finance';

interface AuditIssue {
    id: string;
    type: 'ERROR' | 'WARNING' | 'INFO';
    category: 'BOOKING' | 'ROOM' | 'STOCK' | 'FINANCE';
    message: string;
    details: string;
    actionLabel?: string;
    bookingId?: string;
}

const FinancialAudit: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [issues, setIssues] = useState<AuditIssue[]>([]);
    const [stats, setStats] = useState({
        scannedBookings: 0,
        scannedRooms: 0,
        scannedExpenses: 0,
        errorCount: 0,
        warningCount: 0
    });

    const runAudit = async () => {
        setLoading(true);
        const newIssues: AuditIssue[] = [];
        
        try {
            const [bookings, rooms, expenses, services, categories, settings] = await Promise.all([
                getBookings(),
                getRooms(),
                getExpenses(),
                getServices(),
                getRoomCategories(),
                getSettings()
            ]);

            const taxRate = settings.taxRate || 0;

            // 1. AUDIT BOOKINGS
            bookings.forEach(b => {
                // Check Amount Consistency
                const cat = categories.find(c => c.name === b.roomType);
                if (cat && b.checkIn && b.checkOut) {
                    const start = new Date(b.checkIn);
                    const end = new Date(b.checkOut);
                    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
                    const serviceTotal = b.charges?.reduce((sum, c) => sum + c.amount, 0) || 0;
                    const expectedBaseAmount = cat.price * diffDays;
                    const expectedTotalAmount = expectedBaseAmount + serviceTotal;
                    
                    // Allow small rounding differences or manual adjustments if flagged, but here we check for significant mismatch
                    if (Math.abs(b.amount - expectedTotalAmount) > 1) {
                        newIssues.push({
                            id: `amt-${b.id}`,
                            type: 'WARNING',
                            category: 'BOOKING',
                            message: `Amount mismatch for ${b.guestName}`,
                            details: `Recorded: ${b.amount}, Calculated: ${expectedTotalAmount} (Room: ${expectedBaseAmount}, Services: ${serviceTotal}).`,
                            bookingId: b.id
                        });
                    }
                }

                // Check Payment Status vs Checkout
                if (b.status === 'CHECKED_OUT') {
                    const totalWithTax = getTaxBreakdown(b.amount, taxRate).grandTotal;
                    if ((b.paidAmount || 0) < totalWithTax) {
                        newIssues.push({
                            id: `pay-${b.id}`,
                            type: 'ERROR',
                            category: 'FINANCE',
                            message: `Underpayment on Checked-Out booking`,
                            details: `Guest ${b.guestName} checked out but only paid ${b.paidAmount} of ${totalWithTax}.`,
                            bookingId: b.id
                        });
                    }
                }

                // Check Overpayment
                const totalWithTax = getTaxBreakdown(b.amount, taxRate).grandTotal;
                if ((b.paidAmount || 0) > totalWithTax + 10) { // Small buffer for rounding
                    newIssues.push({
                        id: `overpay-${b.id}`,
                        type: 'INFO',
                        category: 'FINANCE',
                        message: `Potential overpayment`,
                        details: `Guest ${b.guestName} has paid ${b.paidAmount}, which is more than the total due ${totalWithTax}.`,
                        bookingId: b.id
                    });
                }
            });

            // 2. AUDIT ROOMS
            rooms.forEach(r => {
                const activeBooking = bookings.find(b => b.roomNumber === r.id && b.status === 'CHECKED_IN');
                
                if (r.status === 'Occupied' && !activeBooking) {
                    newIssues.push({
                        id: `room-occ-${r.id}`,
                        type: 'ERROR',
                        category: 'ROOM',
                        message: `Ghost Occupancy in Room ${r.id}`,
                        details: `Room is marked as 'Occupied' but no guest is currently checked in.`
                    });
                } else if (r.status !== 'Occupied' && activeBooking) {
                    newIssues.push({
                        id: `room-avail-${r.id}`,
                        type: 'ERROR',
                        category: 'ROOM',
                        message: `Unmarked Occupancy in Room ${r.id}`,
                        details: `Guest ${activeBooking.guestName} is checked in, but the room is marked as '${r.status}'.`
                    });
                }
            });

            // 3. AUDIT STOCK
            services.forEach(s => {
                if (s.trackStock && (s.stock || 0) < 0) {
                    newIssues.push({
                        id: `stock-${s.id}`,
                        type: 'ERROR',
                        category: 'STOCK',
                        message: `Negative Stock for ${s.name}`,
                        details: `Current stock level is ${s.stock}. Stock should never be negative.`
                    });
                }
            });

            setIssues(newIssues);
            setStats({
                scannedBookings: bookings.length,
                scannedRooms: rooms.length,
                scannedExpenses: expenses.length,
                errorCount: newIssues.filter(i => i.type === 'ERROR').length,
                warningCount: newIssues.filter(i => i.type === 'WARNING').length
            });

        } catch (err) {
            console.error("Audit failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runAudit();
    }, []);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-4xl mx-auto">
            <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <DatabaseIcon className="w-6 h-6 text-teal-400" />
                        Financial Integrity Audit
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">Scanning database for discrepancies and financial inconsistencies</p>
                </div>
                <button 
                    onClick={runAudit} 
                    disabled={loading}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                >
                    <RefreshCwIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-6">
                {/* Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Scanned Bookings</div>
                        <div className="text-2xl font-bold text-gray-800">{stats.scannedBookings}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Scanned Rooms</div>
                        <div className="text-2xl font-bold text-gray-800">{stats.scannedRooms}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <div className="text-[10px] font-bold text-red-400 uppercase">Critical Errors</div>
                        <div className="text-2xl font-bold text-red-600">{stats.errorCount}</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <div className="text-[10px] font-bold text-orange-400 uppercase">Warnings</div>
                        <div className="text-2xl font-bold text-orange-600">{stats.warningCount}</div>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <RefreshCwIcon className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Analyzing financial records...</p>
                    </div>
                ) : issues.length === 0 ? (
                    <div className="py-20 text-center bg-green-50 rounded-2xl border border-green-100">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-green-800">System is Healthy</h3>
                        <p className="text-green-600 max-w-md mx-auto mt-2">No financial discrepancies or data inconsistencies were found during the scan.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 mb-4">Discrepancies Found ({issues.length})</h3>
                        <div className="max-height-[500px] overflow-y-auto pr-2 space-y-3">
                            {issues.map(issue => (
                                <div key={issue.id} className={`p-4 rounded-xl border flex gap-4 items-start ${
                                    issue.type === 'ERROR' ? 'bg-red-50 border-red-100' :
                                    issue.type === 'WARNING' ? 'bg-orange-50 border-orange-100' :
                                    'bg-blue-50 border-blue-100'
                                }`}>
                                    <div className="mt-1">
                                        {issue.type === 'ERROR' ? <AlertCircleIcon className="w-5 h-5 text-red-600" /> :
                                         issue.type === 'WARNING' ? <AlertTriangleIcon className="w-5 h-5 text-orange-600" /> :
                                         <SearchIcon className="w-5 h-5 text-blue-600" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-900 text-sm">{issue.message}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                                issue.category === 'FINANCE' ? 'bg-teal-100 text-teal-700' :
                                                issue.category === 'BOOKING' ? 'bg-blue-100 text-blue-700' :
                                                issue.category === 'ROOM' ? 'bg-purple-100 text-purple-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {issue.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">{issue.details}</p>
                                        {issue.bookingId && (
                                            <div className="mt-2 text-[10px] font-mono text-gray-400">
                                                ID: {issue.bookingId}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="bg-gray-50 p-4 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    Audit completed at {new Date().toLocaleTimeString()}
                </p>
            </div>
        </div>
    );
};

export default FinancialAudit;
