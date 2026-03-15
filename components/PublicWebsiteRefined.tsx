import React, { useState, useEffect } from 'react';
import { getWebsiteContent, getRoomCategories, getServices, getSettings, saveBooking, getRooms, getBookings, checkRoomAvailability } from '../services/db';
import { WebsiteContent, RoomCategory, ServiceItem, SystemSettings, Booking, Room } from '../types';
import { PhoneIcon, MailIcon, GlobeIcon, TicketIcon, CheckIcon, UserIcon, CalendarIcon, XCircleIcon, AlertTriangleIcon, BuildingIcon } from './Icons';
import { sendBookingConfirmation } from '../services/email';

const PublicWebsiteRefined: React.FC = () => {
    const [content, setContent] = useState<WebsiteContent | null>(null);
    const [categories, setCategories] = useState<RoomCategory[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [bookingData, setBookingData] = useState({
        guestName: '', phone: '', email: '', identification: '',
        checkIn: '', checkOut: '', categoryId: '', guests: 1
    });
    const [availabilityMap, setAvailabilityMap] = useState<{[categoryId: string]: number}>({});
    const [selectedCategory, setSelectedCategory] = useState<RoomCategory | null>(null);
    
    const colors = {
        primary: '#C9A961',
        primaryDark: '#A68B4A',
        secondary: '#1A1A1A',
        accent: '#2D2D2D',
        light: '#F8F8F8',
        white: '#FFFFFF'
    };

    useEffect(() => {
        const load = async () => {
            const [web, cats, svcs, sett, rms, bks] = await Promise.all([
                getWebsiteContent(), getRoomCategories(), getServices(),
                getSettings(), getRooms(), getBookings()
            ]);
            setContent(web); setCategories(cats); setServices(svcs);
            setSettings(sett); setRooms(rms); setBookings(bks);
            if (cats.length > 0) setBookingData(prev => ({ ...prev, categoryId: cats[0].id }));
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (bookingData.checkIn && bookingData.checkOut && categories.length > 0) {
            const start = new Date(bookingData.checkIn);
            const end = new Date(bookingData.checkOut);
            const availMap: {[categoryId: string]: number} = {};
            
            categories.forEach(category => {
                const categoryRooms = rooms.filter(r => r.categoryId === category.id);
                const unavailableRoomIds = bookings
                    .filter(b => {
                        if (b.status === 'CANCELLED' || b.status === 'CHECKED_OUT') return false;
                        const bStart = new Date(b.checkIn || '');
                        const bEnd = new Date(b.checkOut || '');
                        return start < bEnd && end > bStart;
                    })
                    .map(b => b.roomNumber);
                const available = categoryRooms.filter(r => 
                    !unavailableRoomIds.includes(r.id) && r.status !== 'Maintenance'
                ).length;
                availMap[category.id] = available;
            });
            setAvailabilityMap(availMap);
        }
    }, [bookingData.checkIn, bookingData.checkOut, rooms, bookings]);

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
        return availableRooms.length > 0 ? availableRooms[0].id : null;
    };

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingData.checkIn || !bookingData.checkOut || !bookingData.categoryId) {
            alert("Please fill in all required fields.");
            return;
        }
        if (new Date(bookingData.checkOut) <= new Date(bookingData.checkIn)) {
            alert("Check-out date must be after check-in date.");
            return;
        }
        try {
            const category = categories.find(c => c.id === bookingData.categoryId);
            const assignedRoom = getAvailableRoom(bookingData.categoryId);
            if (!assignedRoom) {
                alert(`Sorry, no rooms available in ${category?.name} category for the selected dates.`);
                return;
            }
            // Server-side double-check to prevent race conditions
            const isStillAvailable = await checkRoomAvailability(assignedRoom, bookingData.checkIn, bookingData.checkOut);
            if (!isStillAvailable) {
                alert(`Sorry, the room just became unavailable. Please try again or select different dates.`);
                return;
            }
            const start = new Date(bookingData.checkIn);
            const end = new Date(bookingData.checkOut);
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            const estimatedAmount = (category?.price || 0) * diffDays;
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
            if (bookingData.email) await sendBookingConfirmation(newBooking, false);
            alert(`✅ Booking Confirmed!\n\nRoom ${assignedRoom} (${category?.name}) has been reserved.\n\nConfirmation sent to ${bookingData.email}`);
            setIsBookingOpen(false);
            setBookingData({ guestName: '', phone: '', email: '', identification: '', checkIn: '', checkOut: '', categoryId: categories[0]?.id || '', guests: 1 });
        } catch (err) {
            console.error("Booking failed", err);
            alert("Failed to submit booking. Please try again.");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-16 h-16 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div></div>;
    if (!content || !settings) return null;

    return (
        <div className="font-sans antialiased" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            {/* Refined Navigation */}
            <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-lg z-50 shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center space-x-3">
                            <div className="w-11 h-11 rounded-sm flex items-center justify-center text-white shadow-md" style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)` }}>
                                <BuildingIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-xl font-bold tracking-tight" style={{ color: colors.secondary }}>{settings.hotelName}</div>
                                <div className="text-xs tracking-widest text-gray-500 uppercase">Luxury Hospitality</div>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <button onClick={() => scrollToSection('home')} className="text-sm font-medium text-gray-700 hover:text-yellow-700 transition-colors">Home</button>
                            <button onClick={() => scrollToSection('about')} className="text-sm font-medium text-gray-700 hover:text-yellow-700 transition-colors">About</button>
                            <button onClick={() => scrollToSection('rooms')} className="text-sm font-medium text-gray-700 hover:text-yellow-700 transition-colors">Rooms</button>
                            <button onClick={() => scrollToSection('facilities')} className="text-sm font-medium text-gray-700 hover:text-yellow-700 transition-colors">Facilities</button>
                            <button onClick={() => scrollToSection('contact')} className="text-sm font-medium text-gray-700 hover:text-yellow-700 transition-colors">Contact</button>
                        </div>
                        <button onClick={() => setIsBookingOpen(true)} className="px-6 py-2.5 text-sm font-semibold text-white rounded-sm shadow-md hover:shadow-lg transition-all" style={{ backgroundColor: colors.primary }}>
                            RESERVE NOW
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section - Refined */}
            <section id="home" className="relative min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: colors.secondary }}>
                <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60"></div>
                {content.heroImage
                    ? <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url(${content.heroImage})` }}></div>
                    : <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920')] bg-cover bg-center opacity-40"></div>
                }
                <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
                    <div className="mb-6 inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase" style={{ backgroundColor: `${colors.primary}30`, color: colors.primary }}>
                        Welcome to Excellence
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {settings.hotelName}
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
                        {content.heroSubtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => scrollToSection('rooms')} className="px-10 py-4 text-base font-semibold text-white rounded-sm shadow-xl hover:shadow-2xl transition-all" style={{ backgroundColor: colors.primary }}>
                            EXPLORE ROOMS
                        </button>
                        <button onClick={() => setIsBookingOpen(true)} className="px-10 py-4 text-base font-semibold bg-white rounded-sm shadow-xl hover:shadow-2xl transition-all" style={{ color: colors.secondary }}>
                            BOOK YOUR STAY
                        </button>
                    </div>
                </div>
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
                        <div className="w-1 h-2 bg-white/50 rounded-full"></div>
                    </div>
                </div>
            </section>

            {/* About Section - Refined */}
            <section id="about" className="py-24 px-6" style={{ backgroundColor: colors.white }}>
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-block mb-4 px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: `${colors.primary}20`, color: colors.primaryDark }}>
                                DISCOVER
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight" style={{ fontFamily: "'Playfair Display', serif", color: colors.secondary }}>
                                {content.aboutTitle}
                            </h2>
                            <div className="w-20 h-1 mb-8" style={{ backgroundColor: colors.primary }}></div>
                            <p className="text-lg text-gray-600 leading-relaxed mb-8 whitespace-pre-line">
                                {content.aboutText}
                            </p>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex items-start space-x-3">
                                    <CheckIcon className="w-5 h-5 mt-1 flex-shrink-0 text-yellow-600" />
                                    <div>
                                        <div className="font-semibold text-gray-900">Luxury Suites</div>
                                        <div className="text-sm text-gray-500">Premium comfort</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <CheckIcon className="w-5 h-5 mt-1 flex-shrink-0 text-yellow-600" />
                                    <div>
                                        <div className="font-semibold text-gray-900">24/7 Service</div>
                                        <div className="text-sm text-gray-500">Always available</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <CheckIcon className="w-5 h-5 mt-1 flex-shrink-0 text-yellow-600" />
                                    <div>
                                        <div className="font-semibold text-gray-900">Fine Dining</div>
                                        <div className="text-sm text-gray-500">Exquisite cuisine</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <CheckIcon className="w-5 h-5 mt-1 flex-shrink-0 text-yellow-600" />
                                    <div>
                                        <div className="font-semibold text-gray-900">Prime Location</div>
                                        <div className="text-sm text-gray-500">City center</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="aspect-[4/3] rounded-lg overflow-hidden shadow-2xl">
                                {content.aboutImage
                                    ? <img src={content.aboutImage} alt="About" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                        <div className="text-center">
                                            <BuildingIcon className="w-20 h-20 mx-auto mb-4 text-gray-400" />
                                            <div className="text-xl font-bold text-gray-500">Hotel Image</div>
                                        </div>
                                      </div>
                                }
                            </div>
                            <div className="absolute -bottom-6 -right-6 w-48 h-48 rounded-lg shadow-xl p-8 text-center" style={{ backgroundColor: colors.primary }}>
                                <div className="text-5xl font-bold text-white mb-2">{categories.length * 10}+</div>
                                <div className="text-sm font-semibold text-white/90 uppercase tracking-wide">Luxury Rooms</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rooms Section - Refined */}
            <section id="rooms" className="py-24 px-6" style={{ backgroundColor: colors.light }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-block mb-4 px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: `${colors.primary}20`, color: colors.primaryDark }}>
                            ACCOMMODATIONS
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif", color: colors.secondary }}>
                            Rooms & Suites
                        </h2>
                        <div className="w-20 h-1 mx-auto mb-6" style={{ backgroundColor: colors.primary }}></div>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Experience unparalleled comfort in our thoughtfully designed accommodations
                        </p>
                    </div>
                    
                    {/* Availability Checker */}
                    <div className="max-w-4xl mx-auto mb-16 bg-white rounded-lg shadow-xl p-8">
                        <h3 className="text-xl font-bold mb-6 text-center" style={{ color: colors.secondary }}>Check Availability</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Check-in</label>
                                <input type="date" className="w-full px-4 py-3 border-2 border-gray-200 rounded-sm focus:border-yellow-600 focus:outline-none transition-colors" min={new Date().toISOString().split('T')[0]} value={bookingData.checkIn} onChange={(e) => setBookingData({...bookingData, checkIn: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Check-out</label>
                                <input type="date" className="w-full px-4 py-3 border-2 border-gray-200 rounded-sm focus:border-yellow-600 focus:outline-none transition-colors" min={bookingData.checkIn || new Date().toISOString().split('T')[0]} value={bookingData.checkOut} onChange={(e) => setBookingData({...bookingData, checkOut: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Guests</label>
                                <input type="number" min="1" max="10" className="w-full px-4 py-3 border-2 border-gray-200 rounded-sm focus:border-yellow-600 focus:outline-none transition-colors" value={bookingData.guests} onChange={(e) => setBookingData({...bookingData, guests: parseInt(e.target.value)})} />
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => bookingData.checkIn && bookingData.checkOut ? scrollToSection('rooms') : alert('Please select dates')} className="w-full px-4 py-3 text-sm font-bold text-white rounded-sm shadow-md hover:shadow-lg transition-all" style={{ backgroundColor: colors.primary }}>
                                    CHECK NOW
                                </button>
                            </div>
                        </div>
                        {bookingData.checkIn && bookingData.checkOut && (
                            <div className="mt-4 text-center text-sm font-medium text-gray-600">
                                {Math.ceil((new Date(bookingData.checkOut).getTime() - new Date(bookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24))} night(s) selected
                            </div>
                        )}
                    </div>

                    {/* Room Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {categories.map(cat => {
                            const available = availabilityMap[cat.id] || 0;
                            const hasAvailability = bookingData.checkIn && bookingData.checkOut;
                            return (
                                <div key={cat.id} className="group bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 relative">
                                    {hasAvailability && (
                                        <div className={`absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs font-bold ${available > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {available > 0 ? `${available} Available` : 'Fully Booked'}
                                        </div>
                                    )}
                                    <div className={`h-56 ${cat.image ? '' : cat.color} relative overflow-hidden`}>
                                        {cat.image
                                            ? <img 
                                                src={cat.image} 
                                                alt={cat.name} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                              />
                                            : <>
                                                <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-black/50 group-hover:from-black/40 group-hover:to-black/60 transition-all"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="text-7xl font-bold text-white/20" style={{ fontFamily: "'Playfair Display', serif" }}>{cat.name.charAt(0)}</div>
                                                </div>
                                              </>
                                        }
                                        <div className="absolute bottom-4 left-4">
                                            <div className="text-xs font-bold tracking-widest uppercase text-white/80">{cat.prefix} SERIES</div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif", color: colors.secondary }}>{cat.name}</h3>
                                        <div className="flex items-baseline justify-between mb-4 pb-4 border-b border-gray-100">
                                            <span className="text-sm text-gray-500">From</span>
                                            <div className="text-right">
                                                <span className="text-3xl font-bold" style={{ color: colors.primary }}>{settings.currency} {(cat.price/1000).toFixed(0)}k</span>
                                                <span className="text-xs text-gray-400 block">per night</span>
                                            </div>
                                        </div>
                                        {hasAvailability && bookingData.checkIn && bookingData.checkOut && (
                                            <div className="mb-4 p-3 rounded-sm" style={{ backgroundColor: `${colors.primary}15` }}>
                                                <div className="text-xs text-gray-600 mb-1">Total for your stay:</div>
                                                <div className="text-xl font-bold" style={{ color: colors.primaryDark }}>
                                                    {settings.currency} {(cat.price * Math.ceil((new Date(bookingData.checkOut).getTime() - new Date(bookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24))).toLocaleString()}
                                                </div>
                                            </div>
                                        )}
                                        <button onClick={() => { if (hasAvailability && available === 0) { alert(`Sorry, ${cat.name} rooms are fully booked.`); return; } setBookingData(prev => ({...prev, categoryId: cat.id})); setSelectedCategory(cat); setIsBookingOpen(true); }} disabled={hasAvailability && available === 0} className={`w-full py-3 text-sm font-bold tracking-wide rounded-sm transition-all ${hasAvailability && available === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white shadow-md hover:shadow-lg'}`} style={{ backgroundColor: hasAvailability && available === 0 ? undefined : colors.primary }}>
                                            {hasAvailability && available === 0 ? 'FULLY BOOKED' : 'RESERVE NOW'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Gallery Section */}
            {content.galleryImages && content.galleryImages.length > 0 && (
                <section id="gallery" className="py-20 px-6" style={{ backgroundColor: colors.light }}>
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <div className="inline-block mb-4 px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: `${colors.primary}20`, color: colors.primaryDark }}>
                                GALLERY
                            </div>
                            <h2 className="text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: colors.secondary }}>
                                Our Hotel
                            </h2>
                            <div className="w-20 h-1 mx-auto mt-4" style={{ backgroundColor: colors.primary }}></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {content.galleryImages.map((img, i) => (
                                <div key={i} className={`overflow-hidden rounded-lg shadow-md ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                                    <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" style={{ minHeight: i === 0 ? '300px' : '150px' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Facilities Section - Refined */}
            <section id="facilities" className="py-24 px-6" style={{ backgroundColor: colors.white }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-block mb-4 px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: `${colors.primary}20`, color: colors.primaryDark }}>
                            AMENITIES
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif", color: colors.secondary }}>
                            World-Class Facilities
                        </h2>
                        <div className="w-20 h-1 mx-auto mb-6" style={{ backgroundColor: colors.primary }}></div>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Everything you need for an exceptional stay
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {services.slice(0, 10).map((svc) => (
                            <div key={svc.id} className="group bg-white border-2 border-gray-100 rounded-lg p-6 text-center hover:border-yellow-600 hover:shadow-xl transition-all duration-300">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: `${colors.primary}20` }}>
                                    <TicketIcon className="w-8 h-8 text-yellow-600" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2 text-sm">{svc.name}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2">{svc.description || 'Premium service'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact/Footer Section - Refined */}
            <footer id="contact" className="py-20 px-6" style={{ backgroundColor: colors.secondary }}>
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="md:col-span-2">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-11 h-11 rounded-sm flex items-center justify-center text-white shadow-md" style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)` }}>
                                    <BuildingIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-white">{settings.hotelName}</div>
                                    <div className="text-xs tracking-widest text-gray-400 uppercase">Luxury Hospitality</div>
                                </div>
                            </div>
                            <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
                                {content.contactText || 'Experience the pinnacle of luxury and comfort at our distinguished hotel.'}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white mb-6">Contact</h4>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <PhoneIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-600" />
                                    <span className="text-sm text-gray-400">{settings.hotelPhone}</span>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <MailIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-600" />
                                    <span className="text-sm text-gray-400">{settings.hotelEmail}</span>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <GlobeIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-600" />
                                    <span className="text-sm text-gray-400">{settings.websiteUrl || 'www.hotel.com'}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white mb-6">Quick Links</h4>
                            <ul className="space-y-3">
                                <li><button onClick={() => scrollToSection('home')} className="text-sm text-gray-400 hover:text-white transition-colors">Home</button></li>
                                <li><button onClick={() => scrollToSection('about')} className="text-sm text-gray-400 hover:text-white transition-colors">About Us</button></li>
                                <li><button onClick={() => scrollToSection('rooms')} className="text-sm text-gray-400 hover:text-white transition-colors">Rooms & Suites</button></li>
                                <li><button onClick={() => scrollToSection('facilities')} className="text-sm text-gray-400 hover:text-white transition-colors">Facilities</button></li>
                                <li><button onClick={() => setIsBookingOpen(true)} className="text-sm hover:text-white transition-colors" style={{ color: colors.primary }}>Book Now</button></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-gray-800 text-center">
                        <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} {settings.hotelName}. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            {/* Booking Modal - Refined */}
            {isBookingOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden">
                        <div className="p-8 flex justify-between items-center border-b" style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)` }}>
                            <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                                Complete Your Reservation
                            </h3>
                            <button onClick={() => setIsBookingOpen(false)} className="text-white hover:text-gray-200 transition-colors">
                                <XCircleIcon className="w-7 h-7" />
                            </button>
                        </div>
                        <form onSubmit={handleBookingSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            {selectedCategory && bookingData.checkIn && bookingData.checkOut && (
                                <div className="p-6 rounded-lg border-2" style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}10` }}>
                                    <div className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: colors.primaryDark }}>Booking Summary</div>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Room Type:</span>
                                            <span className="font-bold text-gray-900">{selectedCategory.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Check-in:</span>
                                            <span className="font-bold text-gray-900">{new Date(bookingData.checkIn).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Check-out:</span>
                                            <span className="font-bold text-gray-900">{new Date(bookingData.checkOut).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Nights:</span>
                                            <span className="font-bold text-gray-900">{Math.ceil((new Date(bookingData.checkOut).getTime() - new Date(bookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24))}</span>
                                        </div>
                                        <div className="flex justify-between pt-3 border-t" style={{ borderColor: colors.primary }}>
                                            <span className="font-bold text-gray-900">Total Amount:</span>
                                            <span className="text-2xl font-bold" style={{ color: colors.primary }}>
                                                {settings.currency} {(selectedCategory.price * Math.ceil((new Date(bookingData.checkOut).getTime() - new Date(bookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24))).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {availabilityMap[selectedCategory.id] > 0 && (
                                        <div className="mt-4 flex items-center space-x-2 text-xs font-bold text-green-700">
                                            <CheckIcon className="w-4 h-4" />
                                            <span>{availabilityMap[selectedCategory.id]} room(s) available - Room assigned automatically</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Check-in</label>
                                    <input type="date" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-sm focus:border-yellow-600 focus:outline-none transition-colors" min={new Date().toISOString().split('T')[0]} value={bookingData.checkIn} onChange={(e) => setBookingData({...bookingData, checkIn: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Check-out</label>
                                    <input type="date" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-sm focus:border-yellow-600 focus:outline-none transition-colors" min={bookingData.checkIn || new Date().toISOString().split('T')[0]} value={bookingData.checkOut} onChange={(e) => setBookingData({...bookingData, checkOut: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Full Name *</label>
                                <input type="text" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-sm focus:border-yellow-600 focus:outline-none transition-colors" placeholder="John Doe" value={bookingData.guestName} onChange={(e) => setBookingData({...bookingData, guestName: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Phone *</label>
                                    <input type="tel" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-sm focus:border-yellow-600 focus:outline-none transition-colors" placeholder="+256..." value={bookingData.phone} onChange={(e) => setBookingData({...bookingData, phone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Email *</label>
                                    <input type="email" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-sm focus:border-yellow-600 focus:outline-none transition-colors" placeholder="john@example.com" value={bookingData.email} onChange={(e) => setBookingData({...bookingData, email: e.target.value})} />
                                </div>
                            </div>
                            <button type="submit" disabled={selectedCategory && availabilityMap[selectedCategory.id] === 0} className={`w-full py-4 text-base font-bold tracking-wide rounded-sm transition-all ${selectedCategory && availabilityMap[selectedCategory.id] === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'text-white shadow-lg hover:shadow-xl'}`} style={{ backgroundColor: selectedCategory && availabilityMap[selectedCategory.id] === 0 ? undefined : colors.primary }}>
                                {selectedCategory && availabilityMap[selectedCategory.id] === 0 ? 'NO ROOMS AVAILABLE' : 'CONFIRM RESERVATION'}
                            </button>
                            <p className="text-center text-xs text-gray-500">No payment required now. Pay upon arrival.</p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicWebsiteRefined;
