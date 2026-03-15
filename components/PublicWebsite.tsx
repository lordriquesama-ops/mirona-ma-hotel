
import React, { useState, useEffect } from 'react';
import { getWebsiteContent, getRoomCategories, getServices, getSettings, saveBooking, getRooms, getBookings } from '../services/db';
import { WebsiteContent, RoomCategory, ServiceItem, SystemSettings, Booking, Room } from '../types';
import { PhoneIcon, MailIcon, GlobeIcon, TicketIcon, CheckIcon, UserIcon, CalendarIcon, XCircleIcon, MessageSquareIcon, AlertTriangleIcon } from './Icons';
import { sendBookingConfirmation } from '../services/email';

const PublicWebsite: React.FC = () => {
    const [content, setContent] = useState<WebsiteContent | null>(null);
    const [categories, setCategories] = useState<RoomCategory[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Booking Form State
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [bookingData, setBookingData] = useState({
        guestName: '',
        phone: '',
        email: '',
        identification: '',
        checkIn: '',
        checkOut: '',
        categoryId: '',
        guests: 1
    });
    
    // Availability State
    const [availabilityMap, setAvailabilityMap] = useState<{[categoryId: string]: number}>({});
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<RoomCategory | null>(null);
    
    // Gold/tan color scheme inspired by luxury hotels
    const colors = {
        primary: '#D4A574', // Gold
        primaryDark: '#B8935F',
        secondary: '#2C2C2C', // Dark gray
        light: '#F5F5F5',
        white: '#FFFFFF'
    };

    useEffect(() => {
        const load = async () => {
            const [web, cats, svcs, sett, rms, bks] = await Promise.all([
                getWebsiteContent(),
                getRoomCategories(),
                getServices(),
                getSettings(),
                getRooms(),
                getBookings()
            ]);
            setContent(web);
            setCategories(cats);
            setServices(svcs);
            setSettings(sett);
            setRooms(rms);
            setBookings(bks);
            
            // Default to first category
            if (cats.length > 0) {
                setBookingData(prev => ({ ...prev, categoryId: cats[0].id }));
            }
            setLoading(false);
        };
        load();
    }, []);
    
    // Check availability whenever dates or category changes
    useEffect(() => {
        if (bookingData.checkIn && bookingData.checkOut && categories.length > 0) {
            checkAvailability();
        }
    }, [bookingData.checkIn, bookingData.checkOut, rooms, bookings]);
    
    const checkAvailability = () => {
        setCheckingAvailability(true);
        
        const start = new Date(bookingData.checkIn);
        const end = new Date(bookingData.checkOut);
        
        const availMap: {[categoryId: string]: number} = {};
        
        categories.forEach(category => {
            // Get all rooms in this category
            const categoryRooms = rooms.filter(r => r.categoryId === category.id);
            
            // Find rooms that are booked during the requested period
            const unavailableRoomIds = bookings
                .filter(b => {
                    if (b.status === 'CANCELLED' || b.status === 'CHECKED_OUT') return false;
                    
                    const bStart = new Date(b.checkIn || '');
                    const bEnd = new Date(b.checkOut || '');
                    
                    // Check for overlap: (StartA < EndB) and (EndA > StartB)
                    return start < bEnd && end > bStart;
                })
                .map(b => b.roomNumber);
            
            // Count available rooms
            const available = categoryRooms.filter(r => 
                !unavailableRoomIds.includes(r.id) && r.status !== 'Maintenance'
            ).length;
            
            availMap[category.id] = available;
        });
        
        setAvailabilityMap(availMap);
        setCheckingAvailability(false);
    };
    
    const getAvailableRoom = (categoryId: string): string | null => {
        const categoryRooms = rooms.filter(r => r.categoryId === categoryId);
        
        if (!bookingData.checkIn || !bookingData.checkOut) return null;
        
        const start = new Date(bookingData.checkIn);
        const end = new Date(bookingData.checkOut);
        
        const unavailableRoomIds = bookings
            .filter(b => {
                if (b.status === 'CANCELLED' || b.status === 'CHECKED_OUT') return false;
                
                const bStart = new Date(b.checkIn || '');
                const bEnd = new Date(b.checkOut || '');
                
                return start < bEnd && end > bStart;
            })
            .map(b => b.roomNumber);
        
        const availableRooms = categoryRooms.filter(r => 
            !unavailableRoomIds.includes(r.id) && r.status !== 'Maintenance'
        );
        
        // Return first available room
        return availableRooms.length > 0 ? availableRooms[0].id : null;
    };

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingData.checkIn || !bookingData.checkOut || !bookingData.categoryId) {
            alert("Please fill in all required fields.");
            return;
        }
        
        // Check if dates are valid
        if (new Date(bookingData.checkOut) <= new Date(bookingData.checkIn)) {
            alert("Check-out date must be after check-in date.");
            return;
        }

        try {
            const category = categories.find(c => c.id === bookingData.categoryId);
            
            // Get an available room
            const assignedRoom = getAvailableRoom(bookingData.categoryId);
            
            if (!assignedRoom) {
                alert(`Sorry, no rooms available in ${category?.name} category for the selected dates. Please try different dates or another room type.`);
                return;
            }
            
            // Calculate estimated cost
            const start = new Date(bookingData.checkIn);
            const end = new Date(bookingData.checkOut);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const estimatedAmount = (category?.price || 0) * (diffDays || 1);

            const newBooking: Booking = {
                id: 'web_' + Date.now().toString(),
                guestName: bookingData.guestName,
                phone: bookingData.phone,
                email: bookingData.email,
                identification: bookingData.identification,
                identificationType: 'National ID',
                checkIn: bookingData.checkIn,
                checkOut: bookingData.checkOut,
                roomType: category?.name || 'Standard',
                roomNumber: assignedRoom,
                amount: estimatedAmount,
                paidAmount: 0,
                status: 'PENDING',
                paymentMethod: 'Pending',
                date: new Date().toISOString(),
                guests: bookingData.guests,
                notes: `Online Booking - Room ${assignedRoom} assigned`,
                charges: [],
                source: 'website' // Mark as website booking
            };

            await saveBooking(newBooking);
            
            // Send Confirmation Email
            if (bookingData.email) {
                await sendBookingConfirmation(newBooking, false);
            }
            
            // Success message with room assignment
            const hotelPhone = settings?.hotelPhone.replace(/[\s\-\(\)\+]/g, '') || '';
            const confirmMsg = `Hello! I just made an online booking:\n\nName: ${bookingData.guestName}\nRoom: ${category?.name} (${assignedRoom})\nDates: ${bookingData.checkIn} to ${bookingData.checkOut}\nGuests: ${bookingData.guests}\n\nPlease confirm my reservation.`;
            
            if (confirm(`✅ Booking Request Submitted!\n\nRoom ${assignedRoom} (${category?.name}) has been reserved for you.\n\nWe've sent a confirmation email to ${bookingData.email}.\n\nWould you like to send your booking details via WhatsApp for immediate confirmation?`)) {
                 window.open(`https://wa.me/${hotelPhone}?text=${encodeURIComponent(confirmMsg)}`, '_blank');
            }

            setIsBookingOpen(false);
            setBookingData({
                guestName: '', phone: '', email: '', identification: '', checkIn: '', checkOut: '', 
                categoryId: categories[0]?.id || '', guests: 1
            });

        } catch (err) {
            console.error("Booking failed", err);
            alert("Failed to submit booking. Please try again or call us directly.");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading website...</div>;
    if (!content || !settings) return <div>Site not configured.</div>;

    return (
        <div className="font-sans text-gray-800 bg-white">
            {/* Navigation - Luxury Style */}
            <nav className="fixed top-0 w-full bg-white z-50 border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-24">
                        {/* Logo */}
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-sm flex items-center justify-center text-white mb-1">
                                <span className="text-2xl font-serif font-bold">M</span>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold tracking-wider text-gray-900 font-serif">{settings.hotelName.split(' ')[0].toUpperCase()}</div>
                                <div className="text-xs tracking-widest text-gray-500 uppercase">Hotels</div>
                            </div>
                        </div>
                        
                        {/* Navigation Links */}
                        <div className="hidden md:flex space-x-10">
                            <button onClick={() => scrollToSection('home')} className="text-gray-600 hover:text-yellow-600 font-medium text-sm tracking-wide transition-colors">Our Hotel</button>
                            {content.showRooms && <button onClick={() => scrollToSection('rooms')} className="text-gray-600 hover:text-yellow-600 font-medium text-sm tracking-wide transition-colors">Rooms & Rates</button>}
                            {content.showServices && <button onClick={() => scrollToSection('amenities')} className="text-gray-600 hover:text-yellow-600 font-medium text-sm tracking-wide transition-colors">Facilities</button>}
                            <button onClick={() => scrollToSection('contact')} className="text-gray-600 hover:text-yellow-600 font-medium text-sm tracking-wide transition-colors">Contact Us</button>
                        </div>
                        
                        {/* Book Now Button */}
                        <button 
                            onClick={() => setIsBookingOpen(true)}
                            style={{ backgroundColor: colors.primary }}
                            className="px-8 py-3 text-white font-semibold text-sm tracking-wide hover:opacity-90 transition-all shadow-md"
                        >
                            BOOK NOW
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section with Booking Bar */}
            <section id="home" className="relative h-screen flex flex-col items-center justify-center text-center px-4" style={{ backgroundColor: colors.secondary }}>
                {/* Background with overlay */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black opacity-95"></div>
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920')] bg-cover bg-center opacity-30"></div>
                </div>
                
                {/* Booking Bar - Positioned at top */}
                <div className="absolute top-32 left-0 right-0 z-20 px-4">
                    <div className="max-w-5xl mx-auto bg-gray-900/80 backdrop-blur-md p-6 rounded-lg shadow-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs text-gray-300 uppercase tracking-wide block mb-2">Check In</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3 bg-white border-0 rounded text-gray-900 focus:ring-2 focus:ring-yellow-600 outline-none"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={bookingData.checkIn}
                                    onChange={(e) => setBookingData({...bookingData, checkIn: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 uppercase tracking-wide block mb-2">Check Out</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3 bg-white border-0 rounded text-gray-900 focus:ring-2 focus:ring-yellow-600 outline-none"
                                    min={bookingData.checkIn || new Date().toISOString().split('T')[0]}
                                    value={bookingData.checkOut}
                                    onChange={(e) => setBookingData({...bookingData, checkOut: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 uppercase tracking-wide block mb-2">Guests</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="10"
                                    className="w-full p-3 bg-white border-0 rounded text-gray-900 focus:ring-2 focus:ring-yellow-600 outline-none"
                                    value={bookingData.guests}
                                    onChange={(e) => setBookingData({...bookingData, guests: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="flex items-end">
                                <button 
                                    onClick={() => {
                                        if (bookingData.checkIn && bookingData.checkOut) {
                                            scrollToSection('rooms');
                                        } else {
                                            alert('Please select check-in and check-out dates');
                                        }
                                    }}
                                    style={{ backgroundColor: colors.primary }}
                                    className="w-full p-3 text-white font-bold tracking-wide hover:opacity-90 transition-all"
                                >
                                    CHECK AVAILABILITY
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Hero Content */}
                <div className="relative z-10 max-w-4xl mx-auto mt-32">
                    <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">
                        WELCOME TO {settings.hotelName.split(' ')[0].toUpperCase()} HOTEL
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-10 font-light tracking-wide">
                        {content.heroSubtitle}
                    </p>
                    <button 
                        onClick={() => scrollToSection('rooms')} 
                        style={{ backgroundColor: colors.primary }}
                        className="px-12 py-4 text-white font-bold text-lg tracking-wider hover:opacity-90 transition-all shadow-xl"
                    >
                        EXPLORE
                    </button>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20 px-4 bg-white">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="text-teal-600 font-bold tracking-widest uppercase mb-2 text-sm">Discover</div>
                        <h2 className="text-4xl font-serif font-bold text-gray-900 mb-6">{content.aboutTitle}</h2>
                        <p className="text-gray-600 leading-relaxed mb-6 whitespace-pre-line">
                            {content.aboutText}
                        </p>
                        <div className="flex gap-4 text-sm font-bold text-gray-800">
                            <div className="flex items-center gap-2"><CheckIcon className="w-5 h-5 text-teal-600" /> Luxury Suites</div>
                            <div className="flex items-center gap-2"><CheckIcon className="w-5 h-5 text-teal-600" /> 24/7 Service</div>
                            <div className="flex items-center gap-2"><CheckIcon className="w-5 h-5 text-teal-600" /> Fine Dining</div>
                        </div>
                    </div>
                    <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl bg-gray-100">
                        {/* Placeholder for About Image - Using CSS Pattern */}
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xl uppercase tracking-widest">
                            Mirona Ma Experience
                        </div>
                    </div>
                </div>
            </section>

            {/* Rooms Section - Luxury Style */}
            {content.showRooms && (
                <section id="rooms" className="py-20 px-4 bg-white">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4" style={{ color: colors.primary }}>Rooms & Rates</h2>
                            <div className="w-24 h-1 mx-auto mb-6" style={{ backgroundColor: colors.primary }}></div>
                            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Designed for comfort and relaxation, our rooms offer the perfect retreat</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {categories.map(cat => {
                                const available = availabilityMap[cat.id] || 0;
                                const hasAvailability = bookingData.checkIn && bookingData.checkOut;
                                
                                return (
                                    <div key={cat.id} className="bg-white border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                                        {/* Availability Badge */}
                                        {hasAvailability && (
                                            <div className={`absolute top-4 right-4 z-10 px-3 py-1 text-xs font-bold ${
                                                available > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                            }`}>
                                                {available > 0 ? `${available} Available` : 'Fully Booked'}
                                            </div>
                                        )}
                                        
                                        <div className={`h-56 ${cat.color} flex items-center justify-center text-white relative overflow-hidden`}>
                                            <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40"></div>
                                            <div className="relative text-6xl font-bold opacity-40 font-serif">{cat.name.charAt(0)}</div>
                                        </div>
                                        <div className="p-6">
                                            <div className="text-xs tracking-widest mb-2" style={{ color: colors.primary }}>
                                                {cat.prefix} SERIES
                                            </div>
                                            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">{cat.name}</h3>
                                            
                                            <div className="flex justify-between items-baseline mb-4 pb-4 border-b border-gray-200">
                                                <span className="text-sm text-gray-500">From</span>
                                                <div className="text-right">
                                                    <span className="text-2xl font-bold" style={{ color: colors.primary }}>
                                                        {settings.currency} {(cat.price/1000).toFixed(0)}k
                                                    </span>
                                                    <span className="text-xs text-gray-400 block">per night</span>
                                                </div>
                                            </div>
                                            
                                            {/* Total Price Estimate */}
                                            {hasAvailability && bookingData.checkIn && bookingData.checkOut && (
                                                <div className="mb-4 p-3 rounded" style={{ backgroundColor: `${colors.primary}15` }}>
                                                    <div className="text-xs text-gray-600 mb-1">Total for your stay:</div>
                                                    <div className="text-lg font-bold" style={{ color: colors.primaryDark }}>
                                                        {settings.currency} {(
                                                            cat.price * Math.ceil((new Date(bookingData.checkOut).getTime() - new Date(bookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24))
                                                        ).toLocaleString()}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <button 
                                                onClick={() => {
                                                    if (hasAvailability && available === 0) {
                                                        alert(`Sorry, ${cat.name} rooms are fully booked for the selected dates.`);
                                                        return;
                                                    }
                                                    setBookingData(prev => ({...prev, categoryId: cat.id}));
                                                    setSelectedCategory(cat);
                                                    setIsBookingOpen(true);
                                                }}
                                                disabled={hasAvailability && available === 0}
                                                className={`w-full py-3 font-bold tracking-wide transition-all ${
                                                    hasAvailability && available === 0
                                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                        : 'text-white hover:opacity-90'
                                                }`}
                                                style={{ backgroundColor: hasAvailability && available === 0 ? undefined : colors.primary }}
                                            >
                                                {hasAvailability && available === 0 ? 'FULLY BOOKED' : 'BOOK NOW'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Facilities Section - Icon Based */}
            {content.showServices && (
                <section id="amenities" className="py-20 px-4" style={{ backgroundColor: colors.light }}>
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4" style={{ color: colors.primary }}>Facilities</h2>
                            <div className="w-24 h-1 mx-auto mb-6" style={{ backgroundColor: colors.primary }}></div>
                            <p className="text-gray-600 text-lg">Everything you need for a perfect stay</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                            {services.slice(0, 10).map((svc, idx) => (
                                <div key={svc.id} className="flex flex-col items-center text-center p-6 bg-white rounded-lg hover:shadow-xl transition-all duration-300 group">
                                    <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: `${colors.primary}20` }}>
                                        <TicketIcon className="w-8 h-8" style={{ color: colors.primary }} />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2 text-sm">{svc.name}</h3>
                                    <p className="text-xs text-gray-500">{svc.description || 'Available'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Footer / Contact - Luxury Style */}
            <footer id="contact" className="pt-20 pb-10 px-4" style={{ backgroundColor: colors.secondary }}>
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    <div>
                        <div className="flex flex-col items-start mb-6">
                             <div className="w-12 h-12 rounded-sm flex items-center justify-center text-white mb-3" style={{ backgroundColor: colors.primary }}>
                                 <span className="text-2xl font-serif font-bold">M</span>
                             </div>
                             <div>
                                 <div className="text-xl font-bold tracking-wider text-white font-serif">{settings.hotelName.split(' ')[0].toUpperCase()}</div>
                                 <div className="text-xs tracking-widest text-gray-400 uppercase">Hotels</div>
                             </div>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            {content.contactText || 'Experience the pinnacle of luxury and comfort.'}
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-6 text-white tracking-wide">Contact Us</h4>
                        <div className="space-y-4 text-sm text-gray-400">
                            <div className="flex items-center gap-3">
                                <PhoneIcon className="w-4 h-4" style={{ color: colors.primary }} />
                                {settings.hotelPhone}
                            </div>
                            <div className="flex items-center gap-3">
                                <MailIcon className="w-4 h-4" style={{ color: colors.primary }} />
                                {settings.hotelEmail}
                            </div>
                            <div className="flex items-center gap-3">
                                <GlobeIcon className="w-4 h-4" style={{ color: colors.primary }} />
                                {settings.websiteUrl || 'www.mironahotel.com'}
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-6 text-white tracking-wide">Quick Links</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><button onClick={() => scrollToSection('home')} className="hover:text-white transition-colors" style={{ color: colors.primary }}>Home</button></li>
                            <li><button onClick={() => scrollToSection('rooms')} className="hover:text-white transition-colors">Rooms & Rates</button></li>
                            <li><button onClick={() => scrollToSection('amenities')} className="hover:text-white transition-colors">Facilities</button></li>
                            <li><button onClick={() => setIsBookingOpen(true)} className="hover:text-white transition-colors">Book a Stay</button></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t pt-8 text-center text-xs text-gray-600" style={{ borderColor: colors.primaryDark }}>
                    &copy; {new Date().getFullYear()} {settings.hotelName}. All rights reserved.
                </div>
            </footer>

            {/* BOOKING MODAL */}
            {isBookingOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-teal-700 p-6 flex justify-between items-center text-white">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5" /> Complete Your Booking
                            </h3>
                            <button onClick={() => setIsBookingOpen(false)} className="hover:text-teal-200">
                                <XCircleIcon className="w-6 h-6"/>
                            </button>
                        </div>
                        <form onSubmit={handleBookingSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* Booking Summary */}
                            {selectedCategory && bookingData.checkIn && bookingData.checkOut && (
                                <div className="bg-teal-50 p-4 rounded-xl border-2 border-teal-200">
                                    <div className="text-sm font-bold text-teal-900 mb-2">Booking Summary</div>
                                    <div className="space-y-1 text-sm text-gray-700">
                                        <div className="flex justify-between">
                                            <span>Room Type:</span>
                                            <span className="font-bold">{selectedCategory.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Check-in:</span>
                                            <span className="font-bold">{new Date(bookingData.checkIn).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Check-out:</span>
                                            <span className="font-bold">{new Date(bookingData.checkOut).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Nights:</span>
                                            <span className="font-bold">
                                                {Math.ceil((new Date(bookingData.checkOut).getTime() - new Date(bookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24))}
                                            </span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-teal-300">
                                            <span className="font-bold">Total Amount:</span>
                                            <span className="font-bold text-teal-700 text-lg">
                                                {settings.currency} {(
                                                    selectedCategory.price * Math.ceil((new Date(bookingData.checkOut).getTime() - new Date(bookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24))
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {availabilityMap[selectedCategory.id] > 0 && (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-green-700 font-bold">
                                            <CheckIcon className="w-4 h-4" />
                                            {availabilityMap[selectedCategory.id]} room(s) available - Room will be assigned automatically
                                        </div>
                                    )}
                                    {availabilityMap[selectedCategory.id] === 0 && (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-red-700 font-bold">
                                            <AlertTriangleIcon className="w-4 h-4" />
                                            No rooms available for selected dates
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Room Type</label>
                                <select 
                                    className="w-full mt-1 p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-teal-500 outline-none"
                                    value={bookingData.categoryId}
                                    onChange={(e) => {
                                        setBookingData({...bookingData, categoryId: e.target.value});
                                        setSelectedCategory(categories.find(c => c.id === e.target.value) || null);
                                    }}
                                >
                                    {categories.map(cat => {
                                        const available = availabilityMap[cat.id] || 0;
                                        const hasAvailability = bookingData.checkIn && bookingData.checkOut;
                                        return (
                                            <option key={cat.id} value={cat.id} disabled={hasAvailability && available === 0}>
                                                {cat.name} - {settings.currency} {(cat.price/1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}k/night
                                                {hasAvailability && ` (${available > 0 ? `${available} available` : 'Fully Booked'})`}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Check-in</label>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={bookingData.checkIn}
                                        onChange={(e) => setBookingData({...bookingData, checkIn: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Check-out</label>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        min={bookingData.checkIn || new Date().toISOString().split('T')[0]}
                                        value={bookingData.checkOut}
                                        onChange={(e) => setBookingData({...bookingData, checkOut: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Full Name *</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full mt-1 pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        placeholder="John Doe"
                                        value={bookingData.guestName}
                                        onChange={(e) => setBookingData({...bookingData, guestName: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Phone *</label>
                                    <div className="relative">
                                        <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            type="tel" 
                                            required
                                            className="w-full mt-1 pl-9 p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                            placeholder="+256..."
                                            value={bookingData.phone}
                                            onChange={(e) => setBookingData({...bookingData, phone: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Email *</label>
                                    <div className="relative">
                                        <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            type="email" 
                                            required
                                            className="w-full mt-1 pl-9 p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                            placeholder="john@example.com"
                                            value={bookingData.email}
                                            onChange={(e) => setBookingData({...bookingData, email: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">ID Number (Optional)</label>
                                <input 
                                    type="text" 
                                    className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="National ID or Passport"
                                    value={bookingData.identification}
                                    onChange={(e) => setBookingData({...bookingData, identification: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Number of Guests</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="10"
                                    required
                                    className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    value={bookingData.guests}
                                    onChange={(e) => setBookingData({...bookingData, guests: parseInt(e.target.value)})}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={selectedCategory && availabilityMap[selectedCategory.id] === 0}
                                className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all mt-4 flex items-center justify-center gap-2 ${
                                    selectedCategory && availabilityMap[selectedCategory.id] === 0
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-900 text-white hover:bg-black'
                                }`}
                            >
                                {selectedCategory && availabilityMap[selectedCategory.id] === 0 
                                    ? 'No Rooms Available' 
                                    : 'Confirm Reservation Request'
                                }
                            </button>
                            <p className="text-center text-xs text-gray-400">
                                No payment required now. Pay upon arrival. A room will be automatically assigned from available rooms in your selected category.
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicWebsite;
