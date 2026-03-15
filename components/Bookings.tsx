
import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon, CalendarIcon, UserIcon, PhoneIcon, CreditCardIcon, BuildingIcon, ReceiptIcon, TagIcon, MailIcon, FileTextIcon, CheckCircleIcon, LogOutIcon, XCircleIcon, SearchIcon, SortIcon, WalletIcon, LayoutIcon, ChevronLeftIcon, ChevronRightIcon, MenuIcon, CheckIcon, PencilIcon, TrashIcon, AlertTriangleIcon, ShareIcon, MessageSquareIcon, FilterIcon } from './Icons';
import { saveBooking, getBookings, logAction, getRoomCategories, getServices, getRooms, updateRoom, upsertGuestFromBooking, getSettings, deleteBooking, updateServiceStock, restoreServiceStock, checkRoomAvailability } from '../services/db';
import { User, RoomCategory, ServiceItem, Booking, ChargeItem, Room, SystemSettings } from '../types';
import { ID_TYPES, PAYMENT_METHODS } from '../constants';
import { getTaxBreakdown, getRoomCost, getConsumptionDetails } from '../utils/finance';
import { useNotifications } from './NotificationSystem';
import { sendBookingConfirmation, openEmailClient } from '../services/email';

interface BookingsProps {
  user: User;
}

type SortKey = 'guestName' | 'checkIn' | 'roomNumber' | 'status' | 'amount';

const Bookings: React.FC<BookingsProps> = ({ user }) => {
  const { notify } = useNotifications(); // Hook for notifications
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
      hotelName: 'Hotel Name', hotelPhone: '', hotelEmail: '', websiteUrl: '', currency: 'UGX', taxRate: 0, receiptFooter: '', exchangeRates: {}
  });
  
  const [showForm, setShowForm] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Summary Stats
  const [stats, setStats] = useState({
      arrivals: 0,
      departures: 0,
      inHouse: 0,
      pending: 0
  });
  
  // View Mode
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [calStartDate, setCalStartDate] = useState(() => {
      const d = new Date();
      d.setHours(0,0,0,0);
      // Start of week (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
  });

  // Print State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Checkout Modal State
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Service Addition State
  const [selectedBookingForService, setSelectedBookingForService] = useState<Booking | null>(null);
  const [selectedServicesMap, setSelectedServicesMap] = useState<{[key: string]: number}>({});

  // Cancellation Modal State
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Delete Modal State
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);

  // Check In Modal State
  const [bookingToCheckIn, setBookingToCheckIn] = useState<Booking | null>(null);

  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'checkIn', direction: 'desc' });

  // Enhanced Form State
  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phone: '',
    identification: '',
    identificationType: 'National ID',
    categoryId: '', // ID of the category
    roomNumbers: [] as string[],
    checkIn: '',
    checkOut: '',
    guests: 1,
    status: 'CONFIRMED',
    paymentMethod: 'Cash',
    amount: 0,
    paidAmount: 0,
    isManualAmount: false,
    notes: ''
  });

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  
  // Get today's date string for min attribute (YYYY-MM-DD)
  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  // Update Stats when bookings change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStats({
        arrivals: bookings.filter(b => b.checkIn === today && b.status === 'CONFIRMED').length,
        departures: bookings.filter(b => b.checkOut === today && b.status === 'CHECKED_IN').length,
        inHouse: bookings.filter(b => b.status === 'CHECKED_IN').length,
        pending: bookings.filter(b => b.status === 'PENDING').length
    });
  }, [bookings]);

  const loadData = async () => {
    try {
        const [loadedBookings, loadedCategories, loadedServices, loadedRooms, loadedSettings] = await Promise.all([
            getBookings(),
            getRoomCategories(),
            getServices(),
            getRooms(),
            getSettings()
        ]);

        setCategories(loadedCategories);
        setServices(loadedServices);
        setRooms(loadedRooms);
        setSettings(loadedSettings);
        
        // Sort bookings by date descending initially
        const sorted = loadedBookings.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBookings(sorted);
        
        // Update Stats
        const today = new Date().toISOString().split('T')[0];
        setStats({
            arrivals: loadedBookings.filter(b => b.checkIn === today && b.status === 'CONFIRMED').length,
            departures: loadedBookings.filter(b => b.checkOut === today && b.status === 'CHECKED_IN').length,
            inHouse: loadedBookings.filter(b => b.status === 'CHECKED_IN').length,
            pending: loadedBookings.filter(b => b.status === 'PENDING').length
        });
        
        // Init form with first category
        if (loadedCategories.length > 0) {
            setFormData(prev => ({ ...prev, categoryId: loadedCategories[0].id }));
        }

        setLoading(false);
    } catch (e) {
        console.error("Failed to load data", e);
        setLoading(false);
    }
  };

  // Dynamic Room Availability Logic
  useEffect(() => {
      if (formData.categoryId && formData.checkIn && formData.checkOut) {
          const category = categories.find(c => c.id === formData.categoryId);
          if (!category) return;

          // 1. Get all rooms in this category
          const catRooms = rooms.filter(r => r.categoryId === formData.categoryId);

          // 2. Find overlapping bookings
          const start = new Date(formData.checkIn);
          const end = new Date(formData.checkOut);

          const unavailableRoomIds = bookings
              .filter(b => {
                  // Exclude self if editing
                  if (isEditing && b.id === editingId) return false;
                  // Exclude cancelled
                  if (b.status === 'CANCELLED' || b.status === 'CHECKED_OUT') return false;
                  
                  const bStart = new Date(b.checkIn || '');
                  const bEnd = new Date(b.checkOut || '');
                  
                  // Overlap Logic: (StartA <= EndB) and (EndA >= StartB)
                  return start < bEnd && end > bStart;
              })
              .map(b => b.roomNumber);

          const available = catRooms
              .filter(r => !unavailableRoomIds.includes(r.id) && r.status !== 'Maintenance')
              .map(r => r.id);
          
          setAvailableRooms(available);
          
          // Auto-select first available if current selection is invalid
          if (formData.roomNumbers.length > 0 && !isEditing) {
              const validRooms = formData.roomNumbers.filter(rn => available.includes(rn));
              if (validRooms.length !== formData.roomNumbers.length) {
                  setFormData(prev => ({...prev, roomNumbers: validRooms}));
              }
          }
      }
  }, [formData.categoryId, formData.checkIn, formData.checkOut, bookings, rooms, isEditing, editingId]);

  // Pricing Engine
  useEffect(() => {
      if (formData.categoryId && formData.checkIn && formData.checkOut && !formData.isManualAmount) {
          const cat = categories.find(c => c.id === formData.categoryId);
          if (cat) {
              const start = new Date(formData.checkIn);
              const end = new Date(formData.checkOut);
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
              const totalDays = diffDays > 0 ? diffDays : 1;
              const roomCount = formData.roomNumbers.length || 1;
              
              setFormData(prev => ({ ...prev, amount: cat.price * totalDays * roomCount }));
          }
      }
  }, [formData.categoryId, formData.checkIn, formData.checkOut, formData.roomNumbers, formData.isManualAmount, categories]);

  // Payment Status Logic
  useEffect(() => {
      if (!isEditing) {
          if (formData.paymentMethod === 'Pending') {
              setFormData(prev => ({ ...prev, status: 'PENDING' }));
          } else if (formData.status !== 'CHECKED_IN') {
              setFormData(prev => ({ ...prev, status: 'CONFIRMED' }));
          }
      }
  }, [formData.paymentMethod]);

  const handleOpenForm = () => {
      setIsEditing(false);
      setEditingId(null);
      setFormData({
        guestName: '', email: '', phone: '', identification: '', identificationType: 'National ID',
        categoryId: categories[0]?.id || '',
        roomNumbers: [],
        checkIn: todayDate,
        checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        guests: 1,
        status: 'CONFIRMED',
        paymentMethod: 'Cash',
        amount: 0,
        paidAmount: 0,
        isManualAmount: false,
        notes: ''
      });
      setShowForm(true);
  };

  const handleEditBooking = (booking: Booking, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setIsEditing(true);
      setEditingId(booking.id);
      
      const cat = categories.find(c => c.name === booking.roomType); // Reverse lookup category by name
      
      setFormData({
          guestName: booking.guestName,
          email: booking.email || '',
          phone: booking.phone || '',
          identification: booking.identification || '',
          identificationType: booking.identificationType || 'National ID',
          categoryId: cat ? cat.id : (categories[0]?.id || ''),
          roomNumbers: booking.roomNumber ? [booking.roomNumber] : [],
          checkIn: booking.checkIn || '',
          checkOut: booking.checkOut || '',
          guests: booking.guests || 1,
          status: booking.status as any,
          paymentMethod: booking.paymentMethod || 'Cash',
          amount: booking.amount,
          paidAmount: booking.paidAmount || 0,
          isManualAmount: true, // Treat as manual when editing to preserve existing price
          notes: booking.notes || ''
      });
      setShowForm(true);
  };

  const handleCloseForm = () => {
      setShowForm(false);
      setIsEditing(false);
      setEditingId(null);
  };

  // --- COMMUNICATION HELPERS ---
  const sanitizePhone = (phone: string) => {
      // Remove spaces, dashes, parentheses
      let clean = phone.replace(/[\s\-\(\)]/g, '');
      // If starts with 0 (e.g. 077...), replace with 256
      if (clean.startsWith('0')) {
          clean = '256' + clean.substring(1);
      }
      // Ensure it doesn't have + if using with wa.me sometimes, but usually wa.me handles it without + better for some regions or requires it. 
      // Safest for wa.me is international format without +
      if (clean.startsWith('+')) {
          clean = clean.substring(1);
      }
      return clean;
  };

  const getConfirmationMessage = () => {
      const roomType = categories.find(c => c.id === formData.categoryId)?.name || 'Standard';
      return `Dear ${formData.guestName},\n\nYour booking at ${settings.hotelName} is confirmed.\n\nRoom: ${roomType}\nDates: ${formData.checkIn} to ${formData.checkOut}\nRef: ${editingId?.substring(0,8).toUpperCase() || 'NEW'}\n\nWe look forward to hosting you!\n\nContact: ${settings.hotelPhone}`;
  };

  const handleWhatsAppShare = () => {
      if (!formData.phone) return alert("Please enter a phone number first.");
      const phone = sanitizePhone(formData.phone);
      const text = encodeURIComponent(getConfirmationMessage());
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleEmailShare = () => {
      if (!formData.email) return alert("Please enter an email address first.");
      
      // Construct a booking object from form data to use shared email logic
      const tempBooking: Booking = {
          id: editingId || 'NEW',
          guestName: formData.guestName,
          email: formData.email,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          roomType: categories.find(c => c.id === formData.categoryId)?.name || 'Standard',
          roomNumber: formData.roomNumbers.join(', '),
          amount: Number(formData.amount),
          paidAmount: Number(formData.paidAmount),
          status: formData.status as any,
          date: new Date().toISOString()
      };
      
      openEmailClient(tempBooking);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
        alert("Check-out date must be after check-in date.");
        return;
    }
    if (formData.roomNumbers.length === 0) {
        alert("Please select at least one room.");
        return;
    }

    // SERVER-SIDE DUPLICATE CHECK: verify each room is still available
    for (const roomId of formData.roomNumbers) {
        const isAvailable = await checkRoomAvailability(
            roomId,
            formData.checkIn,
            formData.checkOut,
            isEditing ? editingId || undefined : undefined
        );
        if (!isAvailable) {
            const roomName = rooms.find(r => r.id === roomId)?.name || roomId;
            notify('Room Unavailable', `Room ${roomName} is already booked for the selected dates. Please choose different dates or a different room.`, 'error');
            return;
        }
    }

    const catName = categories.find(c => c.id === formData.categoryId)?.name || 'Standard';

    // ROOM SWAP LOGIC (Critical for Integrity)
    let oldRoomId: string | undefined;
    if (isEditing && editingId) {
        const oldBooking = bookings.find(b => b.id === editingId);
        if (oldBooking && oldBooking.roomNumber !== formData.roomNumbers[0] && oldBooking.status === 'CHECKED_IN') {
            oldRoomId = oldBooking.roomNumber; // Track old room to release it
        }
    }

    // Get room details
    const selectedRoom = rooms.find(r => r.id === formData.roomNumbers[0]);
    const roomPricePerBooking = formData.amount / formData.roomNumbers.length;
    
    const booking: Booking = {
        id: editingId || Date.now().toString(),
        guestName: formData.guestName,
        email: formData.email,
        phone: formData.phone,
        identification: formData.identification,
        identificationType: formData.identificationType,
        roomType: catName,
        roomNumber: formData.roomNumbers[0],
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        guests: formData.guests,
        amount: Number(formData.amount),
        paidAmount: Number(formData.paidAmount),
        status: formData.status as any,
        paymentMethod: formData.paymentMethod as any,
        notes: formData.notes,
        date: isEditing ? (bookings.find(b => b.id === editingId)?.date || new Date().toISOString()) : new Date().toISOString(),
        charges: isEditing ? (bookings.find(b => b.id === editingId)?.charges || []) : [],
        source: isEditing ? (bookings.find(b => b.id === editingId)?.source || 'admin') : 'admin' // Preserve source or default to admin
    };

    try {
        if (isEditing) {
            await saveBooking(booking);
            
            // Send Email if address exists
            if (booking.email) {
                await sendBookingConfirmation(booking, isEditing);
            }

            setBookings(prev => prev.map(b => b.id === booking.id ? booking : b));
            await logAction(user, 'UPDATE_BOOKING', `Updated booking for ${booking.guestName}`);
            
            // Handle Room Swap: Release old room if user moved
            if (oldRoomId) {
                const roomToRelease = rooms.find(r => r.id === oldRoomId);
                if (roomToRelease) {
                    const updatedOldRoom = { ...roomToRelease, status: 'Cleaning' as const };
                    await updateRoom(updatedOldRoom); // Old room becomes dirty
                    setRooms(prev => prev.map(r => r.id === oldRoomId ? updatedOldRoom : r));
                }
                // New room will be occupied if status is Checked In
                if (booking.status === 'CHECKED_IN') {
                    const newRoom = rooms.find(r => r.id === booking.roomNumber);
                    if (newRoom) {
                        const updatedNewRoom = { ...newRoom, status: 'Occupied' as const };
                        await updateRoom(updatedNewRoom);
                        setRooms(prev => prev.map(r => r.id === booking.roomNumber ? updatedNewRoom : r));
                    }
                }
            } else if (booking.status === 'CHECKED_IN') {
                // If editing and ensuring check-in status (e.g. changing from confirmed to checked_in via edit)
                const room = rooms.find(r => r.id === booking.roomNumber);
                if (room && room.status !== 'Occupied') {
                    const updatedRoom = { ...room, status: 'Occupied' as const };
                    await updateRoom(updatedRoom);
                    setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
                }
            }
            
            notify('Booking Updated', `Changes saved for ${booking.guestName}`, 'info');

        } else {
            // Multiple Bookings Logic
            const createdBookings: Booking[] = [];
            const roomPrice = formData.amount / formData.roomNumbers.length;

            for (const rn of formData.roomNumbers) {
                const b: Booking = {
                    ...booking,
                    id: Date.now().toString() + Math.random().toString().substring(2, 7),
                    roomNumber: rn,
                    amount: roomPrice,
                    source: 'admin' // Admin-created booking
                };
                await saveBooking(b);
                createdBookings.push(b);

                // If walk-in, occupy room
                if (b.status === 'CHECKED_IN') {
                    const room = rooms.find(r => r.id === rn);
                    if (room) {
                        const updatedRoom = { ...room, status: 'Occupied' as const };
                        await updateRoom(updatedRoom);
                        setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
                    }
                }

                // Send Email for each
                if (b.email) {
                    await sendBookingConfirmation(b, false);
                }
            }

            setBookings(prev => [...createdBookings, ...prev]);
            await logAction(user, 'CREATE_BOOKING', `Created ${createdBookings.length} bookings for ${booking.guestName}`);
            const sourceLabel = booking.source === 'website' ? ' (from Website)' : '';
            notify('Bookings Created', `${createdBookings.length} rooms reserved for ${booking.guestName}${sourceLabel}.`, 'success');
        }

        handleCloseForm();
    } catch (err) {
        console.error("Booking save failed", err);
        notify('Error', 'Failed to save booking data', 'error');
    }
  };

  const initiateCheckIn = (booking: Booking, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setBookingToCheckIn(booking);
  };

  const processCheckIn = async () => {
      if (!bookingToCheckIn) return;
      
      const updatedBooking = { ...bookingToCheckIn, status: 'CHECKED_IN' as const };
      
      // Update Booking
      await saveBooking(updatedBooking);
      setBookings(prev => prev.map(b => b.id === bookingToCheckIn.id ? updatedBooking : b));

      // Update Room -> Occupied
      if (bookingToCheckIn.roomNumber) {
          const room = rooms.find(r => r.id === bookingToCheckIn.roomNumber);
          if (room) {
              const updatedRoom = { ...room, status: 'Occupied' as const };
              await updateRoom(updatedRoom);
              setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
          }
      }

      await logAction(user, 'CHECK_IN', `Guest Checked In: ${bookingToCheckIn.guestName} (Room ${bookingToCheckIn.roomNumber})`);
      notify('Check-In Complete', `Guest ${bookingToCheckIn.guestName} is now checked in.`, 'success');
      setBookingToCheckIn(null);
  };

  const openCheckoutModal = (booking: Booking, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setCheckoutBooking(booking);
      setPaymentConfirmed(false);
  };

  const handleProcessCheckout = async () => {
      if (!checkoutBooking) return;
      
      const totalDue = getTaxBreakdown(checkoutBooking.amount, settings.taxRate).grandTotal;
      const updatedBooking = { 
          ...checkoutBooking, 
          status: 'CHECKED_OUT' as const,
          paidAmount: totalDue // Set paid amount to total due upon checkout confirmation
      };
      
      // Update Booking
      await saveBooking(updatedBooking);
      setBookings(prev => prev.map(b => b.id === checkoutBooking.id ? updatedBooking : b));

      // Determine next room status: Only 'Cleaning' if checking out on or after scheduled departure date
      const isScheduledDeparture = todayDate >= checkoutBooking.checkOut;
      const nextRoomStatus = isScheduledDeparture ? 'Cleaning' : 'Available';

      // Update Room
      if (checkoutBooking.roomNumber) {
          const room = rooms.find(r => r.id === checkoutBooking.roomNumber);
          if (room) {
              const updatedRoom = { ...room, status: nextRoomStatus as any }; 
              await updateRoom(updatedRoom);
              setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
          }
      }

      await logAction(user, 'CHECK_OUT', `Guest Checked Out: ${checkoutBooking.guestName}`);
      
      notify('Check-Out Complete', `${checkoutBooking.guestName} has departed. Room ${checkoutBooking.roomNumber} marked as ${nextRoomStatus === 'Cleaning' ? 'Dirty' : 'Available'}.`, isScheduledDeparture ? 'warning' : 'success');
      
      // Auto open print dialog
      setCheckoutBooking(null);
      setTimeout(() => setSelectedBooking(updatedBooking), 100); // Small delay to allow state updates
  };

  // --- NEW: Custom Cancel Modal Logic ---
  const initiateCancel = (booking: Booking, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setBookingToCancel(booking);
      setCancellationReason('');
  };

  const confirmCancel = async () => {
      if (!bookingToCancel) return;
      const reason = cancellationReason.trim();
      if (!reason) {
          alert("Please enter a reason for cancellation.");
          return;
      }

      const updatedBooking = { ...bookingToCancel, status: 'CANCELLED' as const, notes: bookingToCancel.notes + ` [Cancelled: ${reason}]` };
      
      await saveBooking(updatedBooking);
      setBookings(prev => prev.map(b => b.id === bookingToCancel.id ? updatedBooking : b));

      // If they were checked in, free the room
      if (bookingToCancel.status === 'CHECKED_IN' && bookingToCancel.roomNumber) {
          const room = rooms.find(r => r.id === bookingToCancel.roomNumber);
          if (room) {
              const updatedRoom = { ...room, status: 'Available' as const };
              await updateRoom(updatedRoom);
              setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
          }
      }

      // RESTORE STOCK LOGIC
      if (bookingToCancel.charges && bookingToCancel.charges.length > 0) {
          for (const charge of bookingToCancel.charges) {
              await restoreServiceStock(charge.description, charge.qty);
          }
      }

      await logAction(user, 'CANCEL_BOOKING', `Cancelled booking for ${bookingToCancel.guestName}`);
      notify('Booking Cancelled', `Reservation for ${bookingToCancel.guestName} has been cancelled.`, 'info');
      setBookingToCancel(null);
  };

  // --- NEW: Custom Delete Modal Logic ---
  const initiateDelete = (booking: Booking, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setBookingToDelete(booking);
  };

  const confirmDelete = async () => {
      if (!bookingToDelete) return;
      
      const id = bookingToDelete.id;
      
      // RESTORE STOCK LOGIC BEFORE DELETION
      if (bookingToDelete.charges && bookingToDelete.charges.length > 0) {
          for (const charge of bookingToDelete.charges) {
              await restoreServiceStock(charge.description, charge.qty);
          }
      }

      // DATA INTEGRITY CHECK
      if (bookingToDelete.status === 'CHECKED_IN' && bookingToDelete.roomNumber) {
          const room = rooms.find(r => r.id === bookingToDelete.roomNumber);
          if (room && room.status === 'Occupied') {
              const updatedRoom = { ...room, status: 'Available' as const };
              await updateRoom(updatedRoom);
              setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
          }
      }

      await deleteBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
      await logAction(user, 'DELETE_BOOKING', `Deleted booking ID ${id}`);
      setBookingToDelete(null);
  };

  const handleConfirmBooking = async (booking: Booking, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const updatedBooking = { ...booking, status: 'CONFIRMED' as const };
      await saveBooking(updatedBooking);
      setBookings(prev => prev.map(b => b.id === booking.id ? updatedBooking : b));
      await logAction(user, 'CONFIRM_BOOKING', `Confirmed booking for ${booking.guestName}`);
      notify('Confirmed', `Booking for ${booking.guestName} is now confirmed.`, 'success');
  };

  // --- SERVICE MANAGEMENT ---
  const handleOpenServiceModal = (booking: Booking, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedBookingForService(booking);
      setSelectedServicesMap({});
      setShowServiceModal(true);
  };

  const toggleServiceSelection = (serviceId: string) => {
      setSelectedServicesMap(prev => {
          const newMap = { ...prev };
          if (newMap[serviceId]) {
              delete newMap[serviceId];
          } else {
              newMap[serviceId] = 1; // Default qty 1
          }
          return newMap;
      });
  };

  const updateServiceQty = (serviceId: string, qty: number) => {
      if (qty < 1) return;
      setSelectedServicesMap(prev => ({ ...prev, [serviceId]: qty }));
  };

  const handleSubmitService = async () => {
      if (!selectedBookingForService) return;
      
      const newCharges: ChargeItem[] = [];
      const serviceEntries = Object.entries(selectedServicesMap);

      for (const [svcId, qtyValue] of serviceEntries) {
          const qty = Number(qtyValue);
          const svc = services.find(s => s.id === svcId);
          if (svc) {
              // Check Stock
              if (svc.trackStock && svc.stock !== undefined) {
                  if (svc.stock < qty) {
                      alert(`Insufficient stock for ${svc.name}. Available: ${svc.stock}`);
                      return; // Halt
                  }
                  // Decrement Stock
                  await updateServiceStock(svc.id, qty);
              }

              newCharges.push({
                  id: Date.now().toString() + Math.random().toString(),
                  description: svc.name,
                  amount: svc.price * qty,
                  qty: qty,
                  date: new Date().toISOString().split('T')[0]
              });
          }
      }

      if (newCharges.length === 0) return;

      const updatedBooking = { 
          ...selectedBookingForService, 
          amount: selectedBookingForService.amount + newCharges.reduce((a,c) => a + c.amount, 0),
          charges: [...(selectedBookingForService.charges || []), ...newCharges] 
      };

      await saveBooking(updatedBooking);
      setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
      await logAction(user, 'ADD_CHARGE', `Added services to ${updatedBooking.guestName}`);
      notify('Charge Added', `Added ${newCharges.length} items to ${updatedBooking.guestName}'s bill.`, 'success');
      
      setShowServiceModal(false);
      setSelectedServicesMap({});
  };

  // --- SORTING & FILTERING ---
  const handleSort = (key: SortKey) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      setSortConfig({ key, direction });
  };

  const SortIndicator = ({ column }: { column: SortKey }) => {
      const isActive = sortConfig.key === column;
      return (
          <SortIcon 
              className={`w-3 h-3 transition-all ${
                  isActive 
                      ? `text-teal-600 ${sortConfig.direction === 'desc' ? 'transform rotate-180' : ''}` 
                      : 'text-gray-300 group-hover:text-gray-400'
              }`} 
          />
      );
  };

  const processedBookings = bookings.filter(b => {
      const matchesSearch = 
        b.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.id.includes(searchTerm) ||
        (b.roomNumber || '').includes(searchTerm);
      
      const matchesStatus = filterStatus === 'ALL' || b.status === filterStatus;
      
      const matchesDate = !filterDate || (b.checkIn === filterDate || b.checkOut === filterDate);
      
      return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => {
      // Explicit type handling for sorting
      if (sortConfig.key === 'amount') {
          return sortConfig.direction === 'asc' 
            ? a.amount - b.amount
            : b.amount - a.amount;
      }
      
      if (sortConfig.key === 'roomNumber') {
           const rA = a.roomNumber || '';
           const rB = b.roomNumber || '';
           return sortConfig.direction === 'asc'
             ? rA.localeCompare(rB, undefined, { numeric: true })
             : rB.localeCompare(rA, undefined, { numeric: true });
      }

      // Default string comparison
      let valA = '';
      let valB = '';

      if (sortConfig.key === 'guestName') {
        valA = a.guestName;
        valB = b.guestName;
      } else if (sortConfig.key === 'checkIn') {
        valA = a.checkIn || '';
        valB = b.checkIn || '';
      } else if (sortConfig.key === 'status') {
        valA = a.status;
        valB = b.status;
      }

      const strA = valA.toLowerCase();
      const strB = valB.toLowerCase();

      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
  });

  // Calculate receipt totals (Tax Exclusive: Tax is added ON TOP of Subtotal)
  const renderCalendar = () => {
      const daysToShow = 21;
      const days = [];
      const tempDate = new Date(calStartDate);
      
      for(let i=0; i<daysToShow; i++) {
          days.push(new Date(tempDate));
          tempDate.setDate(tempDate.getDate() + 1);
      }

      // Group rooms by category
      const roomsByCat: {[key:string]: Room[]} = {};
      categories.forEach(c => roomsByCat[c.name] = []);
      rooms.forEach(r => {
          if (roomsByCat[r.categoryName]) roomsByCat[r.categoryName].push(r);
      });

      return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto w-full">
              <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky left-0 bg-white z-20">
                  <div className="flex gap-2">
                      <button onClick={() => {const d = new Date(calStartDate); d.setDate(d.getDate()-7); setCalStartDate(d)}} className="p-1 hover:bg-gray-100 rounded"><ChevronLeftIcon className="w-5 h-5"/></button>
                      <button onClick={() => setCalStartDate(new Date())} className="text-xs font-bold px-3 py-1 bg-gray-100 rounded">Today</button>
                      <button onClick={() => {const d = new Date(calStartDate); d.setDate(d.getDate()+7); setCalStartDate(d)}} className="p-1 hover:bg-gray-100 rounded"><ChevronRightIcon className="w-5 h-5"/></button>
                  </div>
                  <span className="text-sm font-bold text-gray-700">
                      {calStartDate.toLocaleDateString()} - {days[days.length-1].toLocaleDateString()}
                  </span>
              </div>
              
              <div className="min-w-max">
                  {/* Header Row */}
                  <div className="flex border-b border-gray-200">
                      <div className="w-32 p-2 sticky left-0 bg-gray-50 z-10 border-r font-bold text-xs text-gray-500 uppercase">Room</div>
                      {days.map(d => (
                          <div key={d.toISOString()} className={`w-12 p-2 border-r text-center text-xs ${d.toISOString().split('T')[0] === todayDate ? 'bg-blue-50 font-bold text-blue-600' : 'text-gray-500'}`}>
                              {d.getDate()}<br/>{d.toLocaleDateString('en-US',{weekday:'narrow'})}
                          </div>
                      ))}
                  </div>

                  {/* Body */}
                  {Object.keys(roomsByCat).map(catName => (
                      <React.Fragment key={catName}>
                          <div className="bg-gray-100 p-1 px-4 text-xs font-bold text-gray-500 uppercase sticky left-0 z-10">{catName}</div>
                          {roomsByCat[catName].map(room => (
                              <div key={room.id} className="flex border-b border-gray-100 h-10 group relative">
                                  <div className="w-32 p-2 sticky left-0 bg-white z-10 border-r text-[11px] font-bold text-gray-600 flex items-center justify-between group-hover:bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                      <div className="flex flex-col">
                                          <span>{room.name}</span>
                                          <span className="text-[8px] text-gray-400 uppercase tracking-tighter">{room.status}</span>
                                      </div>
                                      <div className={`w-1.5 h-1.5 rounded-full ${room.status === 'Occupied' ? 'bg-red-500' : room.status === 'Cleaning' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                  </div>
                                  
                                  <div className="relative flex-1">
                                      {/* Grid Lines */}
                                      <div className="flex h-full absolute inset-0 pointer-events-none">
                                          {days.map(d => (
                                              <div key={d.toISOString()} className={`w-12 border-r h-full ${d.getDay()===0||d.getDay()===6?'bg-gray-50/50':''}`}></div>
                                          ))}
                                      </div>

                                      {/* Booking Bars */}
                                      {bookings
                                        .filter(b => b.roomNumber === room.id && b.status !== 'CANCELLED')
                                        .map(b => {
                                            // Handle invalid dates gracefully
                                            const start = new Date(b.checkIn || '');
                                            const end = new Date(b.checkOut || '');
                                            
                                            if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

                                            const viewStart = days[0];
                                            const viewEnd = days[days.length-1];
                                            
                                            // Check overlap
                                            if (end < viewStart || start > viewEnd) return null;

                                            // Calc position
                                            const effectiveStart = start < viewStart ? viewStart : start;
                                            const effectiveEnd = end > viewEnd ? viewEnd : end;
                                            
                                            const diffDays = (effectiveStart.getTime() - viewStart.getTime()) / (1000 * 3600 * 24);
                                            const duration = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 3600 * 24);
                                            
                                            // 48px is w-12
                                            const left = diffDays * 48; 
                                            const width = Math.max(duration, 1) * 48;

                                            const colorClass = b.status === 'CHECKED_IN' ? 'bg-blue-500' : b.status === 'CHECKED_OUT' ? 'bg-gray-400' : 'bg-green-500';

                                            return (
                                                <div 
                                                    key={b.id}
                                                    onClick={(e) => handleEditBooking(b, e)}
                                                    className={`absolute top-1 h-8 rounded shadow-sm text-[10px] text-white flex items-center px-2 whitespace-nowrap overflow-hidden cursor-pointer hover:brightness-110 z-0 ${colorClass}`}
                                                    style={{ left: `${left}px`, width: `${width - 2}px` }}
                                                    title={`${b.guestName} (${b.status})`}
                                                >
                                                    {b.guestName}
                                                </div>
                                            );
                                      })}
                                  </div>
                              </div>
                          ))}
                      </React.Fragment>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10 w-full max-w-none">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
        <div>
           <h2 className="text-lg font-bold text-gray-800">Booking Management</h2>
           <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Manage reservations and assign rooms</p>
        </div>
        <div className="flex gap-2">
            <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`p-1.5 rounded ${viewMode === 'LIST' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    title="List View"
                >
                    <MenuIcon className="w-4 h-4"/>
                </button>
                <button 
                    onClick={() => setViewMode('CALENDAR')}
                    className={`p-1.5 rounded ${viewMode === 'CALENDAR' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    title="Calendar View"
                >
                    <CalendarIcon className="w-4 h-4"/>
                </button>
            </div>
            <button 
                onClick={handleOpenForm}
                className="bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-teal-700 shadow-sm transition-all"
            >
                <PlusIcon className="w-3.5 h-3.5" /> New Booking
            </button>
        </div>
      </div>
      
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                  <CheckCircleIcon className="w-4 h-4" />
              </div>
              <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Arrivals</div>
                  <div className="text-lg font-bold text-gray-800">{stats.arrivals}</div>
              </div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <LogOutIcon className="w-4 h-4" />
              </div>
              <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Departures</div>
                  <div className="text-lg font-bold text-gray-800">{stats.departures}</div>
              </div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <BuildingIcon className="w-4 h-4" />
              </div>
              <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">In-House</div>
                  <div className="text-lg font-bold text-gray-800">{stats.inHouse}</div>
              </div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
                  <AlertTriangleIcon className="w-4 h-4" />
              </div>
              <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending</div>
                  <div className="text-lg font-bold text-gray-800">{stats.pending}</div>
              </div>
          </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col xl:flex-row gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100 w-full">
          <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input 
                  type="text" 
                  placeholder="Search Guest, Room or Booking ID..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs"
              />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Filter Date:</span>
                  <div className="relative">
                      <CalendarIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input 
                          type="date" 
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs bg-white"
                      />
                      {filterDate && (
                          <button 
                            onClick={() => setFilterDate('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >✕</button>
                      )}
                  </div>
              </div>

              <div className="w-px h-4 bg-gray-200 mx-1 hidden sm:block"></div>

              <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar">
                  {['ALL', 'CONFIRMED', 'PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].map(status => (
                      <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                              filterStatus === status 
                              ? 'bg-teal-600 text-white border-teal-600 shadow-sm' 
                              : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                      >
                          {status.replace('_', ' ')}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* List Header with Count */}
      <div className="flex justify-between items-center px-1">
          <div className="text-xs font-bold text-gray-500">
              Showing <span className="text-teal-600">{processedBookings.length}</span> {processedBookings.length === 1 ? 'Booking' : 'Bookings'}
              {filterDate && <span> for <span className="text-gray-800">{new Date(filterDate).toLocaleDateString()}</span></span>}
          </div>
      </div>

      {/* Content View */}
      {viewMode === 'CALENDAR' && (
          <div className="flex gap-4 mb-2 px-1">
              <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Confirmed</span>
              </div>
              <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Checked In</span>
              </div>
              <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gray-400"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Checked Out</span>
              </div>
          </div>
      )}
      {viewMode === 'CALENDAR' ? renderCalendar() : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
            <div className="overflow-x-auto w-full no-scrollbar">
                <table className="w-full text-left min-w-[800px] md:min-w-0">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th onClick={() => handleSort('guestName')} className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group w-1/4 transition-colors">
                                <div className="flex items-center gap-1.5">Guest <SortIndicator column="guestName" /></div>
                            </th>
                            <th onClick={() => handleSort('checkIn')} className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group w-1/5 transition-colors">
                                <div className="flex items-center gap-1.5">Dates <SortIndicator column="checkIn" /></div>
                            </th>
                            <th onClick={() => handleSort('roomNumber')} className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group w-1/12 transition-colors">
                                <div className="flex items-center gap-1.5">Room <SortIndicator column="roomNumber" /></div>
                            </th>
                            <th onClick={() => handleSort('status')} className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group w-1/6 transition-colors">
                                <div className="flex items-center gap-1.5">Status <SortIndicator column="status" /></div>
                            </th>
                            <th onClick={() => handleSort('amount')} className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group w-1/6 transition-colors">
                                <div className="flex items-center gap-1.5">Amount <SortIndicator column="amount" /></div>
                            </th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right w-1/6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {processedBookings.map(booking => (
                            <tr 
                                key={booking.id} 
                                className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                onClick={(e) => handleEditBooking(booking, e)}
                            >
                                <td className="px-4 py-2.5">
                                    <div className="font-bold text-gray-800 text-xs truncate max-w-[200px]">{booking.guestName}</div>
                                    <div className="text-[10px] text-gray-400 font-medium">{booking.phone}</div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="text-[10px] font-medium text-gray-700 data-value">
                                        <div className="flex items-center gap-1">
                                            <span className="text-green-600 font-bold">IN:</span> 
                                            {booking.checkIn}
                                            {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && booking.checkIn < todayDate && (
                                                <AlertTriangleIcon className="w-3 h-3 text-red-500 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1"><span className="text-red-400 font-bold">OUT:</span> {booking.checkOut}</div>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-gray-200">
                                        {booking.roomNumber}
                                    </span>
                                    <div className="text-[9px] text-gray-400 mt-0.5 truncate max-w-[80px] font-medium">{booking.roomType}</div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight border w-fit whitespace-nowrap ${
                                            booking.status === 'CONFIRMED' ? 'bg-green-50 text-green-600 border-green-100' :
                                            booking.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                            booking.status === 'CHECKED_IN' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            booking.status === 'CHECKED_OUT' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                                            'bg-red-50 text-red-600 border-red-100'
                                        }`}>
                                            {booking.status.replace('_', ' ')}
                                        </span>
                                        {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && booking.checkIn < todayDate && (
                                            <span className="text-[8px] font-bold text-red-600 bg-red-50 border border-red-100 px-1 py-0.5 rounded uppercase w-fit animate-pulse">
                                                Overdue
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 font-bold text-xs text-gray-700">
                                    <div className="data-value">{settings.currency} {getTaxBreakdown(booking.amount, settings.taxRate).grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    {booking.status === 'CHECKED_IN' && (
                                        <div className="mt-1">
                                            <div className={`text-[9px] uppercase tracking-tighter font-bold ${getConsumptionDetails(booking, settings.taxRate).remaining < 0 ? 'text-red-500' : 'text-teal-600'}`}>
                                                Credit: {settings.currency} {getConsumptionDetails(booking, settings.taxRate).remaining.toLocaleString()}
                                            </div>
                                            <div className="w-full bg-gray-100 h-1 rounded-full mt-0.5 overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${getConsumptionDetails(booking, settings.taxRate).remaining < 0 ? 'bg-red-500' : 'bg-teal-500'}`}
                                                    style={{ width: `${Math.min(100, (getConsumptionDetails(booking, settings.taxRate).consumed / (booking.paidAmount || 1)) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                    {booking.status === 'CHECKED_OUT' && (
                                        <div className="mt-1">
                                            <div className="text-[9px] uppercase tracking-tighter font-bold text-gray-600">
                                                Paid: {settings.currency} {(booking.paidAmount || 0).toLocaleString()}
                                            </div>
                                            {(() => {
                                                const totalDue = getTaxBreakdown(booking.amount, settings.taxRate).grandTotal;
                                                const paid = booking.paidAmount || 0;
                                                const balance = totalDue - paid;
                                                const paymentPercent = totalDue > 0 ? (paid / totalDue) * 100 : 0;
                                                return (
                                                    <>
                                                        {balance > 0 && (
                                                            <div className="text-[9px] uppercase tracking-tighter font-bold text-red-500">
                                                                Balance: {settings.currency} {balance.toLocaleString()}
                                                            </div>
                                                        )}
                                                        <div className="w-full bg-gray-100 h-1 rounded-full mt-0.5 overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-500 ${paymentPercent >= 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                                                                style={{ width: `${Math.min(100, paymentPercent)}%` }}
                                                            ></div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                    <div className="text-[9px] font-normal text-gray-400 uppercase tracking-tighter">via {booking.paymentMethod}</div>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        {/* Actions based on status */}
                                        {booking.status === 'PENDING' && (
                                            <button 
                                                onClick={(e) => handleConfirmBooking(booking, e)}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                                                title="Confirm Booking"
                                            >
                                                <CheckIcon className="w-3.5 h-3.5"/>
                                            </button>
                                        )}

                                        {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
                                            <button 
                                                onClick={(e) => initiateCheckIn(booking, e)}
                                                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold text-[10px] hover:bg-blue-700 transition-all shadow-sm flex items-center gap-1 whitespace-nowrap active:scale-95"
                                            >
                                                Check In
                                            </button>
                                        )}
                                        
                                        {booking.status === 'CHECKED_IN' && (
                                            <>
                                                <button 
                                                    onClick={(e) => handleOpenServiceModal(booking, e)}
                                                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                                                    title="Add Service Charge"
                                                >
                                                    <PlusIcon className="w-3.5 h-3.5"/>
                                                </button>
                                                <button 
                                                    onClick={(e) => openCheckoutModal(booking, e)}
                                                    className="px-2.5 py-1 bg-orange-500 text-white rounded-lg font-bold text-[10px] hover:bg-orange-600 transition-all shadow-sm flex items-center gap-1 whitespace-nowrap active:scale-95"
                                                >
                                                    Check Out
                                                </button>
                                            </>
                                        )}

                                        {booking.status !== 'CANCELLED' && booking.status !== 'CHECKED_OUT' && user.role !== 'RECEPTION' && (
                                            <button 
                                                onClick={(e) => initiateCancel(booking, e)}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                title="Cancel Booking"
                                            >
                                                <XCircleIcon className="w-4 h-4"/>
                                            </button>
                                        )}

                                        <div className="w-px h-4 bg-gray-200 self-center mx-1"></div>

                                        {/* Always Visible Edit Button */}
                                        <button 
                                            onClick={(e) => handleEditBooking(booking, e)}
                                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                            title="Edit Booking"
                                        >
                                            <PencilIcon className="w-4 h-4"/>
                                        </button>

                                        {/* Only Visible Print Receipt for Checked Out (Payment Confirmed) */}
                                        {booking.status === 'CHECKED_OUT' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}
                                                className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-teal-100"
                                                title="Print Final Receipt"
                                            >
                                                <ReceiptIcon className="w-4 h-4"/>
                                            </button>
                                        )}

                                        {user.role === 'ADMIN' && (
                                            <button 
                                                onClick={(e) => initiateDelete(booking, e)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                title="Delete Record Permanently"
                                            >
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {processedBookings.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400">No bookings found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>
      )}

      {/* CHECK-IN CONFIRMATION MODAL */}
      {bookingToCheckIn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-blue-100">
                  <div className="p-6">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircleIcon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 text-center mb-1">Check In Guest?</h3>
                      <p className="text-sm text-gray-500 text-center mb-6">
                          Confirming arrival for <span className="font-bold">{bookingToCheckIn.guestName}</span> to Room <span className="font-bold text-gray-800">{bookingToCheckIn.roomNumber}</span>.
                      </p>
                      
                      {/* Dynamic Warnings */}
                      {bookingToCheckIn.paymentMethod === 'Pending' && (
                          <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg flex gap-3 items-start mb-4">
                              <AlertTriangleIcon className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                              <div className="text-xs text-yellow-800">
                                  <span className="font-bold block mb-1">Payment Pending</span>
                                  Payment has not been confirmed. Please verify payment before handing over keys.
                              </div>
                          </div>
                      )}

                      {bookingToCheckIn.checkIn && bookingToCheckIn.checkIn > todayDate && (
                          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 items-start mb-4">
                              <CalendarIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                              <div className="text-xs text-blue-800">
                                  <span className="font-bold block mb-1">Future Date Warning</span>
                                  This booking is scheduled for <strong>{bookingToCheckIn.checkIn}</strong>. Checking in early will start room charges now.
                              </div>
                          </div>
                      )}

                      <div className="flex gap-3">
                          <button 
                              onClick={() => setBookingToCheckIn(null)}
                              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={processCheckIn}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
                          >
                              Confirm Check In
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CANCELLATION CONFIRMATION MODAL */}
      {bookingToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-red-100">
                  <div className="p-6">
                      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <XCircleIcon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 text-center mb-2">Cancel Booking?</h3>
                      <p className="text-sm text-gray-500 text-center mb-4">
                          This will cancel the reservation for <span className="font-bold">{bookingToCancel.guestName}</span>.
                      </p>
                      
                      <div className="mb-6">
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cancellation Reason</label>
                          <textarea 
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                              rows={2}
                              value={cancellationReason}
                              onChange={(e) => setCancellationReason(e.target.value)}
                              placeholder="e.g. Guest request, No show..."
                          />
                      </div>

                      <div className="flex gap-3">
                          <button 
                              onClick={() => setBookingToCancel(null)}
                              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                          >
                              Back
                          </button>
                          <button 
                              onClick={confirmCancel}
                              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
                          >
                              Confirm Cancel
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {bookingToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-red-100">
                  <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertTriangleIcon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Record Permanently?</h3>
                      <p className="text-sm text-gray-500 mb-6">
                          Are you sure you want to delete this booking for <span className="font-bold text-gray-800">{bookingToDelete.guestName}</span>? 
                          This action is irreversible and should only be used for data errors.
                      </p>
                      <div className="flex gap-3">
                          <button 
                              onClick={() => setBookingToDelete(null)}
                              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={confirmDelete}
                              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
                          >
                              Delete
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* BOOKING FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[95vh] flex flex-col">
                <div className="bg-teal-700 p-6 flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {isEditing ? <PencilIcon className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
                        {isEditing ? 'Edit Booking' : 'New Reservation'}
                    </h3>
                    <button onClick={handleCloseForm} className="text-teal-100 hover:text-white">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                    {/* Section 1: Guest Info */}
                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        <h4 className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <UserIcon className="w-3.5 h-3.5" /> Guest Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Guest Full Name <span className="text-red-500">*</span></label>
                                <div className="relative mt-1">
                                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input required type="text" value={formData.guestName} onChange={e => setFormData({...formData, guestName: e.target.value})} className="w-full p-2 pl-9 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm transition-all" placeholder="e.g. John Doe" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Phone / WhatsApp</label>
                                <div className="relative mt-1">
                                    <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 pl-9 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm transition-all" placeholder="+256..." />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Email Address</label>
                                <div className="relative mt-1">
                                    <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 pl-9 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm transition-all" placeholder="guest@example.com" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Identification Details</label>
                                <div className="flex gap-2 mt-1">
                                    <select 
                                        className="w-1/3 p-2 border border-gray-200 rounded-lg bg-white text-xs font-bold text-gray-600 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                        value={formData.identificationType}
                                        onChange={(e) => setFormData({...formData, identificationType: e.target.value})}
                                    >
                                        {ID_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                    <div className="relative w-2/3">
                                        <FileTextIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input 
                                            type="text" 
                                            value={formData.identification} 
                                            onChange={e => setFormData({...formData, identification: e.target.value})} 
                                            className="w-full p-2 pl-9 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm transition-all" 
                                            placeholder="ID / Passport Number"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Stay Details */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100">
                        <h4 className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <CalendarIcon className="w-3.5 h-3.5" /> Stay & Room Assignment
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Check-in Date</label>
                                <input required type="date" min={todayDate} value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="w-full mt-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm transition-all" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Check-out Date</label>
                                <input required type="date" min={formData.checkIn || todayDate} value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="w-full mt-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm transition-all" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Room Category</label>
                                <select 
                                    className="w-full mt-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm transition-all bg-white"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({...formData, categoryId: e.target.value, roomNumbers: []})}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name} ({settings.currency} {cat.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight flex justify-between">
                                    Assign Room(s) 
                                    {availableRooms.length > 0 && <span className="text-green-600 font-bold">{availableRooms.length} Available</span>}
                                </label>
                                <div className={`mt-1 p-2 border rounded-lg max-h-32 overflow-y-auto bg-white ${availableRooms.length === 0 && !isEditing ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                                    {isEditing ? (
                                        <select 
                                            className="w-full p-1 outline-none text-sm bg-transparent"
                                            value={formData.roomNumbers[0] || ''}
                                            onChange={(e) => setFormData({...formData, roomNumbers: [e.target.value]})}
                                            required
                                        >
                                            <option value="">-- Select Room --</option>
                                            {!availableRooms.includes(formData.roomNumbers[0]) && formData.roomNumbers[0] && (
                                                <option value={formData.roomNumbers[0]}>{formData.roomNumbers[0]} (Current)</option>
                                            )}
                                            {availableRooms.map(rid => (
                                                <option key={rid} value={rid}>{rid}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="space-y-1">
                                            {availableRooms.map(rid => {
                                                const room = rooms.find(r => r.id === rid);
                                                return (
                                                    <label key={rid} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-100 group">
                                                        <div className="flex items-center gap-3">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={formData.roomNumbers.includes(rid)}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        roomNumbers: checked 
                                                                            ? [...prev.roomNumbers, rid]
                                                                            : prev.roomNumbers.filter(id => id !== rid)
                                                                    }));
                                                                }}
                                                                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-gray-800">{room?.name || rid}</span>
                                                                <span className="text-[10px] text-gray-400 font-mono">{rid}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${room?.color || 'bg-gray-400'}`}></span>
                                                            <span className="text-[11px] font-bold text-gray-600">{( (room?.price || 0) / 1000).toLocaleString()}k</span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                            {availableRooms.length === 0 && (
                                                <p className="text-[10px] text-gray-400 italic text-center py-2">No rooms available</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {availableRooms.length === 0 && !isEditing && (
                                    <p className="text-[9px] text-red-500 mt-1 font-bold uppercase tracking-tighter">No rooms available for selected dates!</p>
                                )}
                                {!isEditing && formData.roomNumbers.length > 0 && (
                                    <p className="text-[10px] text-teal-600 mt-1 font-bold">{formData.roomNumbers.length} room(s) selected</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Payment */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-teal-600 uppercase tracking-wide">Payment & Status</h4>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase cursor-pointer flex items-center gap-1">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.isManualAmount} 
                                            onChange={(e) => setFormData({...formData, isManualAmount: e.target.checked})}
                                            className="w-3 h-3 text-teal-600 rounded"
                                        />
                                        Manual Override
                                    </label>
                                </div>
                                {formData.isManualAmount ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-500">{settings.currency}</span>
                                        <input 
                                            type="number"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                                            className="w-32 p-1 text-right font-bold font-mono text-gray-800 border-b-2 border-teal-500 bg-transparent focus:outline-none"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-lg font-bold font-mono text-gray-800">{settings.currency} {getTaxBreakdown(formData.amount, settings.taxRate).grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                )}
                                {formData.isManualAmount && (
                                    <span className="text-[10px] text-teal-600 font-bold mt-1">Total Incl. Tax: {settings.currency} {getTaxBreakdown(formData.amount, settings.taxRate).grandTotal.toLocaleString()}</span>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Payment Method</label>
                                <select 
                                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                                >
                                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Amount Paid ({settings.currency})</label>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, paidAmount: getTaxBreakdown(formData.amount, settings.taxRate).grandTotal})}
                                        className="text-[10px] font-bold text-teal-600 hover:text-teal-700 underline"
                                    >
                                        Pay Full
                                    </button>
                                </div>
                                <input 
                                    type="number"
                                    value={formData.paidAmount}
                                    onChange={(e) => setFormData({...formData, paidAmount: Number(e.target.value)})}
                                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono font-bold"
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Booking Status</label>
                                <select 
                                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    {isEditing && <option value="CHECKED_IN">Checked In</option>}
                                    {isEditing && <option value="CHECKED_OUT">Checked Out</option>}
                                    {user.role !== 'RECEPTION' && <option value="CANCELLED">Cancelled</option>}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Guest Communication (Confirmation Actions) */}
                    {isEditing && (
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <ShareIcon className="w-4 h-4" /> Guest Communication
                            </h4>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button 
                                    type="button"
                                    onClick={handleWhatsAppShare}
                                    disabled={!formData.phone}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <MessageSquareIcon className="w-4 h-4" /> WhatsApp Confirmation
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleEmailShare}
                                    disabled={!formData.email}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <MailIcon className="w-4 h-4 text-gray-500" /> Email Confirmation
                                </button>
                            </div>
                            {(!formData.phone && !formData.email) && (
                                <p className="text-[10px] text-red-400 mt-2 text-center">Add contact details to send confirmation.</p>
                            )}
                        </div>
                    )}

                    {/* Submit Buttons */}
                    <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={handleCloseForm} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={availableRooms.length === 0 && !isEditing}
                            className="px-8 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isEditing ? 'Update Booking' : 'Create Booking'}
                        </button>
                    </div>
                </form>
             </div>
        </div>
      )}

      {/* SERVICE MODAL */}
      {showServiceModal && selectedBookingForService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="bg-purple-700 p-6 flex justify-between items-center shrink-0">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <TagIcon className="w-5 h-5" /> Add Service Charge
                        </h3>
                        <p className="text-purple-200 text-xs">For {selectedBookingForService.guestName} (Room {selectedBookingForService.roomNumber})</p>
                      </div>
                      <button onClick={() => setShowServiceModal(false)} className="text-purple-200 hover:text-white">✕</button>
                  </div>
                  
                  <div className="p-4 overflow-y-auto flex-1">
                      <div className="space-y-2">
                          {services.map(svc => {
                              const qty = selectedServicesMap[svc.id] || 0;
                              const isSelected = qty > 0;
                              return (
                                  <div 
                                    key={svc.id} 
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'}`}
                                    onClick={() => toggleServiceSelection(svc.id)}
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300'}`}>
                                              {isSelected && <CheckIcon className="w-3 h-3"/>}
                                          </div>
                                          <div>
                                              <div className="font-bold text-gray-800">{svc.name}</div>
                                              <div className="text-xs text-gray-500">{settings.currency} {svc.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                              {svc.trackStock && (
                                                  <div className={`text-[10px] font-bold ${svc.stock && svc.stock < 10 ? 'text-red-500' : 'text-green-600'}`}>
                                                      Stock: {svc.stock}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                      
                                      {isSelected && (
                                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                              <button onClick={() => updateServiceQty(svc.id, qty - 1)} className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-gray-600">-</button>
                                              <span className="text-sm font-bold w-4 text-center">{qty}</span>
                                              <button onClick={() => updateServiceQty(svc.id, qty + 1)} className="w-6 h-6 rounded bg-purple-200 hover:bg-purple-300 flex items-center justify-center font-bold text-purple-700">+</button>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                      <div className="text-sm font-bold text-gray-600">
                          Total: <span className="text-purple-700 font-mono text-lg ml-1">
                              {settings.currency} {Object.entries(selectedServicesMap).reduce((acc: number, [id, q]: [string, number]) => acc + (services.find(s => s.id === id)?.price || 0) * q, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                      </div>
                      <button 
                        onClick={handleSubmitService}
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 shadow-sm"
                        disabled={Object.keys(selectedServicesMap).length === 0}
                      >
                          Add Charges
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* CHECKOUT MODAL */}
      {checkoutBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="bg-orange-500 p-6 flex justify-between items-center text-white">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                          <LogOutIcon className="w-5 h-5" /> Checkout Guest
                      </h3>
                      <button onClick={() => setCheckoutBooking(null)} className="hover:bg-orange-600 p-1 rounded transition-colors">✕</button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div className="text-center">
                          <h2 className="text-xl font-bold text-gray-800">{checkoutBooking.guestName}</h2>
                          <p className="text-sm text-gray-500">Room {checkoutBooking.roomNumber}</p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Room Charge:</span>
                              <span className="font-bold">{getRoomCost(checkoutBooking).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Services:</span>
                              <span className="font-bold">
                                  {(checkoutBooking.charges?.reduce((a: number, c) => a+c.amount, 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                          </div>
                          <div className="border-t border-gray-200 pt-1"></div>
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Subtotal:</span>
                              <span className="font-bold">{checkoutBooking.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Tax ({settings.taxRate}%):</span>
                              <span className="font-bold">{getTaxBreakdown(checkoutBooking.amount, settings.taxRate).tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold text-gray-800">
                              <span>Total Due:</span>
                              <span>{settings.currency} {getTaxBreakdown(checkoutBooking.amount, settings.taxRate).grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-teal-700">
                              <span>Paid to Date:</span>
                              <span>{settings.currency} {(checkoutBooking.paidAmount || 0).toLocaleString()}</span>
                          </div>
                          <div className={`flex justify-between text-sm font-bold ${getConsumptionDetails(checkoutBooking, settings.taxRate).remaining < 0 ? 'text-red-600' : 'text-orange-700'}`}>
                              <span>{getConsumptionDetails(checkoutBooking, settings.taxRate).remaining < 0 ? 'Balance Due:' : 'Remaining Credit:'}</span>
                              <span>{settings.currency} {Math.abs(getConsumptionDetails(checkoutBooking, settings.taxRate).remaining).toLocaleString()}</span>
                          </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <input 
                              type="checkbox" 
                              id="paymentConfirm" 
                              checked={paymentConfirmed}
                              onChange={(e) => setPaymentConfirmed(e.target.checked)}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <label htmlFor="paymentConfirm" className="text-sm font-bold text-blue-800 cursor-pointer select-none">
                              Payment Received & Verified
                          </label>
                      </div>

                      <button 
                          onClick={handleProcessCheckout}
                          disabled={!paymentConfirmed}
                          className="w-full py-3 bg-gray-800 text-white font-bold rounded-xl shadow-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                          Complete Checkout
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* RECEIPT MODAL */}
      {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:p-0">
             
             {/* Print Controls - Hidden during print */}
             <div className="absolute top-4 right-4 flex gap-2 print:hidden z-50">
                <button onClick={() => setSelectedBooking(null)} className="px-4 py-2 bg-gray-100 rounded text-gray-600 hover:bg-gray-200">Close</button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center gap-2">
                    <ReceiptIcon className="w-4 h-4" /> Print Receipt
                </button>
            </div>

             {/* THERMAL POS RECEIPT LAYOUT */}
            <div id="printable-receipt" className="bg-white w-[80mm] p-4 mx-auto shadow-2xl print:shadow-none print:w-full print:m-0 font-mono text-black border border-gray-100">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-2 font-serif text-xl font-bold">M</div>
                    <h2 className="font-bold text-lg uppercase tracking-widest">{settings.hotelName || 'MIRONA MA'}</h2>
                    <p className="text-[10px] opacity-70">{settings.hotelEmail}</p>
                    <p className="text-[10px] opacity-70">Tel: {settings.hotelPhone}</p>
                </div>

                <div className="border-b border-dashed border-black/30 my-4"></div>
                
                <div className="text-[11px] space-y-1.5 mb-4">
                    <div className="flex justify-between">
                        <span className="opacity-60">RECEIPT #:</span>
                        <span className="font-bold">{selectedBooking.id.substring(0,8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-60">DATE:</span>
                        <span>{new Date().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-60">GUEST:</span>
                        <span className="font-bold uppercase">{selectedBooking.guestName.substring(0,20)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-60">ISSUED BY:</span>
                        <span>{user.name.split(' ')[0].toUpperCase()}</span>
                    </div>
                    {selectedBooking.paymentMethod && (
                         <div className="flex justify-between">
                            <span className="opacity-60">PAYMENT:</span>
                            <span className="font-bold">{selectedBooking.paymentMethod.toUpperCase()}</span>
                        </div>
                    )}
                </div>

                <div className="border-b border-dashed border-black/30 my-4"></div>

                <div className="text-[11px] mb-4">
                    <div className="flex font-bold mb-2 border-b border-black/10 pb-1">
                        <span className="flex-1">DESCRIPTION</span>
                        <span className="w-8 text-center">QTY</span>
                        <span className="w-20 text-right">AMOUNT</span>
                    </div>
                    {/* Room Charge */}
                    <div className="flex py-1">
                        <div className="flex-1">
                            <div className="font-bold">{selectedBooking.roomType.toUpperCase()}</div>
                            <div className="text-[9px] opacity-60">ROOM {selectedBooking.roomNumber} | {selectedBooking.checkIn} - {selectedBooking.checkOut}</div>
                        </div>
                        <span className="w-8 text-center">1</span>
                        <span className="w-20 text-right font-bold">{(getRoomCost(selectedBooking)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pl-2 text-[10px] italic">Room {selectedBooking.roomNumber}</div>
                    <div className="pl-2 text-[10px] italic">{selectedBooking.checkIn} to {selectedBooking.checkOut}</div>

                    {/* Extra Services */}
                    {selectedBooking.charges && selectedBooking.charges.length > 0 && (
                        <>
                            <div className="my-2 border-b border-dotted border-black/10"></div>
                            {selectedBooking.charges.map((charge, idx) => (
                                <div key={idx} className="flex py-0.5">
                                    <span className="flex-1 uppercase">{charge.description.substring(0,20)}</span>
                                    <span className="w-8 text-center">{charge.qty}</span>
                                    <span className="w-20 text-right">{charge.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <div className="border-b border-dashed border-black/30 my-4"></div>

                <div className="text-[11px] font-bold space-y-2">
                    <div className="flex justify-between">
                        <span className="opacity-60">SUBTOTAL:</span>
                        <span>{settings.currency} {getTaxBreakdown(selectedBooking.amount, settings.taxRate).subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {settings.taxRate > 0 && (
                        <div className="flex justify-between">
                            <span className="opacity-60">TAX ({settings.taxRate}%):</span>
                            <span>{settings.currency} {getTaxBreakdown(selectedBooking.amount, settings.taxRate).tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-black pt-2 mt-2">
                        <span>TOTAL DUE:</span>
                        <span>{settings.currency} {getTaxBreakdown(selectedBooking.amount, settings.taxRate).grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[11px] border-t border-dashed border-black/20 pt-1 mt-1">
                        <span>TOTAL PAID:</span>
                        <span>{settings.currency} {(selectedBooking.paidAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-black border-t border-dashed border-black/20 pt-1">
                        <span>{getConsumptionDetails(selectedBooking, settings.taxRate).remaining < 0 ? 'BALANCE DUE:' : 'REMAINING CREDIT:'}</span>
                        <span>{settings.currency} {Math.abs(getConsumptionDetails(selectedBooking, settings.taxRate).remaining).toLocaleString()}</span>
                    </div>
                </div>

                <div className="mt-8 text-center space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Thank you for staying with us!</p>
                    <p className="text-[9px] opacity-60 italic">{settings.receiptFooter || 'Please come again.'}</p>
                    <div className="pt-4 opacity-30 text-[8px]">
                        POWERED BY MIRONA COMMAND CENTER
                    </div>
                </div>
            </div>

          </div>
      )}
    </div>
  );
};

export default Bookings;
