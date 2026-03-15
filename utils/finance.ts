
import { Booking, SystemSettings } from '../types';

/**
 * Calculates tax breakdown based on system settings.
 * Tax is exclusive (added on top of subtotal).
 */
export const getTaxBreakdown = (amount: number, taxRate: number) => {
    if (!taxRate || taxRate <= 0) return { tax: 0, subTotal: amount, grandTotal: amount };
    const taxAmount = Math.round(amount * (taxRate / 100));
    return { tax: taxAmount, subTotal: amount, grandTotal: amount + taxAmount };
};

/**
 * Calculates the cost of the room only, excluding extra services.
 */
export const getRoomCost = (booking: Booking) => {
    const totalServices = booking.charges?.reduce((sum, c) => sum + c.amount, 0) || 0;
    return booking.amount - totalServices;
};

/**
 * Calculates consumption details for a booking.
 * Returns consumed amount, remaining balance/credit, and stay duration info.
 */
export const getConsumptionDetails = (booking: Booking, taxRate: number) => {
    if (!booking.checkIn || !booking.checkOut) {
        return { consumed: 0, remaining: 0, daysStayed: 0, totalDays: 1, dailyRate: 0 };
    }
    
    const start = new Date(booking.checkIn);
    const end = new Date(booking.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalTime = end.getTime() - start.getTime();
    const totalDays = Math.ceil(totalTime / (1000 * 60 * 60 * 24)) || 1;
    
    let daysStayed = 0;
    if (today >= start) {
        const stayedTime = today.getTime() - start.getTime();
        daysStayed = Math.floor(stayedTime / (1000 * 60 * 60 * 24)) + 1;
    }
    
    daysStayed = Math.min(daysStayed, totalDays);
    daysStayed = Math.max(daysStayed, 0);
    
    // Use Grand Total for consumption calculation
    const taxInfo = getTaxBreakdown(booking.amount, taxRate);
    const grandTotal = taxInfo.grandTotal;
    const dailyRate = grandTotal / totalDays;
    const consumed = dailyRate * daysStayed;
    const paid = booking.paidAmount || 0;
    const remaining = paid - consumed;
    
    return { consumed, remaining, daysStayed, totalDays, dailyRate };
};
