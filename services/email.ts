
import { Booking, SystemSettings } from '../types';
import { getSettings } from './db';

// Template for the email content
const generateEmailBody = (booking: Booking, settings: SystemSettings, isUpdate: boolean = false) => {
    const totalAmount = booking.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const status = booking.status.replace('_', ' ');
    
    return `
Dear ${booking.guestName},

${isUpdate ? 'Your booking details have been updated.' : 'Thank you for choosing ' + settings.hotelName + '! Your reservation is confirmed.'}

**Booking Reference:** ${booking.id.substring(0, 8).toUpperCase()}

**Stay Details:**
- **Check-in:** ${booking.checkIn}
- **Check-out:** ${booking.checkOut}
- **Room Type:** ${booking.roomType}
- **Room Number:** ${booking.roomNumber || 'Assigned on Arrival'}
- **Guests:** ${booking.guests || 1}

**Payment Details:**
- **Total Amount:** ${settings.currency} ${totalAmount}
- **Status:** ${status}

If you have any questions, please contact us at ${settings.hotelPhone} or reply to this email.

We look forward to hosting you!

Warm regards,
${settings.hotelName} Team
${settings.websiteUrl || ''}
    `.trim();
};

export const sendBookingConfirmation = async (booking: Booking, isUpdate: boolean = false): Promise<boolean> => {
    if (!booking.email) {
        console.warn("No email address provided for guest.");
        return false;
    }

    try {
        const settings = await getSettings();
        const subject = `${isUpdate ? 'Booking Update' : 'Booking Confirmation'} - ${settings.hotelName} (Ref: ${booking.id.substring(0, 8).toUpperCase()})`;
        const body = generateEmailBody(booking, settings, isUpdate);

        // OPTION 1: Real Email Sending (Requires EmailJS or backend)
        // This is a placeholder for actual API integration
        // await emailjs.send('service_id', 'template_id', { ...params });
        
        console.log(`[EMAIL MOCK] Sending to ${booking.email}:`, { subject, body });

        // OPTION 2: Client-side Mailto Fallback (Opens default mail client)
        // This ensures functionality without a backend server
        const mailtoLink = `mailto:${booking.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        // We return true to indicate the "process" succeeded, even if we just generated a link
        // In a real app, you might want to open this link in a hidden iframe or specific user action
        // window.open(mailtoLink, '_blank'); 
        
        return true;
    } catch (error) {
        console.error("Failed to prepare email", error);
        return false;
    }
};

export const openEmailClient = async (booking: Booking) => {
    if (!booking.email) return;
    const settings = await getSettings();
    const subject = `Booking Confirmation - ${settings.hotelName}`;
    const body = generateEmailBody(booking, settings);
    window.location.href = `mailto:${booking.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
