import { supabase, supabaseAdmin, TABLES, generateBookingNumber, Database } from './supabase';
import { User, Booking, Room, RoomCategory, Guest, ServiceItem, ExpenseRecord, SystemSettings, Shift, AuditLogEntry } from '../types';

// Type mapping helpers
const mapBookingFromSupabase = (sb: Database['public']['Tables']['bookings']['Row']): Booking => ({
  id: sb.id,
  guestName: sb.guest_name,
  roomType: sb.room_name,
  amount: sb.amount,
  status: sb.status,
  paymentMethod: sb.payment_method as any,
  date: sb.created_at,
  checkIn: sb.check_in_date,
  checkOut: sb.check_out_date,
  roomNumber: sb.room_id,
  email: sb.email,
  phone: sb.phone,
  identification: sb.identification,
  identificationType: sb.identification_type,
  guests: sb.guests,
  notes: sb.notes,
  charges: sb.charges || [],
  paidAmount: sb.paid_amount,
  source: (sb as any).source || 'admin', // Add source field
  // Additional fields for compatibility
  roomId: sb.room_id,
  roomName: sb.room_name,
  roomPrice: sb.room_price,
  checkInDate: sb.check_in_date,
  checkOutDate: sb.check_out_date,
  adults: sb.adults,
  children: sb.children,
  userId: sb.user_id,
  bookingNumber: sb.booking_number
});

const mapBookingToSupabase = (booking: Booking): Database['public']['Tables']['bookings']['Insert'] => {
  const baseData = {
    guest_name: booking.guestName,
    phone: booking.phone,
    email: booking.email,
    identification: booking.identification,
    identification_type: booking.identificationType,
    room_id: booking.roomId || booking.roomNumber || '',
    room_name: booking.roomName || booking.roomType || '',
    room_price: booking.roomPrice || booking.amount,
    check_in_date: booking.checkInDate || booking.checkIn || '',
    check_out_date: booking.checkOutDate || booking.checkOut || '',
    adults: booking.adults || booking.guests || 2,
    children: booking.children || 0,
    guests: booking.guests || 1,
    amount: booking.amount,
    paid_amount: booking.paidAmount || 0,
    payment_method: booking.paymentMethod,
    status: booking.status,
    notes: booking.notes,
    charges: booking.charges,
    user_id: booking.userId || null,
    source: booking.source || 'admin'
  };
  
  return baseData as any;
};

const mapRoomFromSupabase = (sb: Database['public']['Tables']['rooms']['Row']): Room => ({
  id: sb.id,
  name: sb.name,
  categoryId: sb.category_id,
  categoryName: sb.category_name,
  price: sb.price,
  status: sb.status,
  color: sb.color,
  floor: sb.floor,
  notes: sb.notes
});

const mapCategoryFromSupabase = (sb: Database['public']['Tables']['categories']['Row']): RoomCategory => ({
  id: sb.id,
  name: sb.name,
  price: sb.price,
  prefix: sb.prefix,
  count: sb.count,
  color: sb.color,
  image: (sb as any).image_url || undefined
});

const mapGuestFromSupabase = (sb: Database['public']['Tables']['guests']['Row']): Guest => ({
  id: sb.id,
  name: sb.name,
  phone: sb.phone,
  email: sb.email,
  identification: sb.identification,
  identificationType: sb.identification_type,
  visits: sb.visits,
  totalSpent: sb.total_spent,
  lastVisit: sb.last_visit,
  isVip: sb.is_vip,
  preferences: sb.preferences,
  notes: sb.notes
});

const mapServiceFromSupabase = (sb: Database['public']['Tables']['services']['Row']): ServiceItem => ({
  id: sb.id,
  name: sb.name,
  price: sb.price,
  stock: sb.stock,
  category: sb.category,
  description: sb.description
});

const mapUserFromSupabase = (sb: Database['public']['Tables']['users']['Row']): User => ({
  id: sb.id,
  username: sb.username,
  name: sb.name,
  role: sb.role,
  avatarColor: sb.avatar_color
});

// Supabase Adapter Functions
export const supabaseAdapter = {
  // Authentication
  async signIn(username: string, password: string): Promise<User> {
    console.log('🔍 Attempting login:', { username, password });
    
    // Use admin client to bypass RLS policies
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw new Error('Database error: ' + error.message);
    }

    if (!data) {
      console.error('❌ User not found:', username);
      throw new Error('User not found. Please run SQL schema first.');
    }

    console.log('✅ User found:', data);

    // Simple password check (upgrade to proper auth later)
    if (password === 'password123') {
      console.log('✅ Password verified for user:', username);
      return {
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role,
        avatarColor: data.avatar_color
      };
    }

    console.error('❌ Invalid password for user:', username);
    throw new Error('Invalid credentials. Use admin/password123');
  },

  // Users
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Supabase getUsers failed:', error);
      throw error;
    }
    
    return (data || []).map(mapUserFromSupabase);
  },

  async addUser(user: User): Promise<User> {
    console.log('➕ Adding user to Supabase:', user.username);
    
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .insert({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar_color: user.avatarColor
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase addUser failed:', error);
      throw error;
    }
    
    console.log('✅ User added to Supabase:', user.username);
    return mapUserFromSupabase(data);
  },

  async updateUser(user: User): Promise<User> {
    console.log('📝 Updating user in Supabase:', user.username);
    
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({
        username: user.username,
        name: user.name,
        role: user.role,
        avatar_color: user.avatarColor
      })
      .eq('id', user.id)
      .select();

    if (error) {
      console.error('❌ Supabase updateUser failed:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error(`User ${user.id} not found`);
    }
    
    console.log('✅ User updated in Supabase:', user.username);
    return mapUserFromSupabase(data[0]);
  },

  async deleteUser(id: string): Promise<void> {
    console.log('🗑️ Deleting user from Supabase:', id);
    
    const { error } = await supabaseAdmin
      .from(TABLES.USERS)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Supabase deleteUser failed:', error);
      throw error;
    }
    
    console.log('✅ User deleted from Supabase:', id);
  },

  // Bookings
  async getBookings(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from(TABLES.BOOKINGS)
      .select('*')
      .order('created_at', { ascending: false }); // Newest first

    if (error) throw error;
    return (data || []).map(mapBookingFromSupabase);
  },

  async saveBooking(booking: Booking): Promise<Booking> {
    const bookingData = mapBookingToSupabase(booking);
    
    // UUID v4 pattern - only upsert if ID is a valid UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.id || '');
    const isNew = !booking.id || booking.id === 'NEW' || !isUUID;

    if (!isNew) {
      console.log('📝 Saving booking (upsert):', booking.id);
      
      const { data, error } = await supabase
        .from(TABLES.BOOKINGS)
        .upsert({
          ...bookingData,
          id: booking.id,
          booking_number: booking.bookingNumber || generateBookingNumber()
        }, { onConflict: 'id' })
        .select();

      if (error) {
        console.error('❌ Upsert error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(`Booking ${booking.id} save failed`);
      }

      return mapBookingFromSupabase(data[0]);
    } else {
      // Non-UUID or new booking - let Supabase generate a proper UUID
      console.log('➕ Inserting new booking (non-UUID id discarded):', booking.id);
      const { data, error } = await supabase
        .from(TABLES.BOOKINGS)
        .insert({
          ...bookingData,
          booking_number: booking.bookingNumber || generateBookingNumber()
        })
        .select()
        .single();

      if (error) throw error;
      return mapBookingFromSupabase(data);
    }
  },

  async deleteBooking(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.BOOKINGS)
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Rooms
  async getRooms(): Promise<Room[]> {
    const { data, error } = await supabase
      .from(TABLES.ROOMS)
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(mapRoomFromSupabase);
  },

  async updateRoom(room: Room): Promise<Room> {
    const { data, error } = await supabase
      .from(TABLES.ROOMS)
      .update({
        name: room.name,
        status: room.status,
        notes: room.notes,
        floor: room.floor
      })
      .eq('id', room.id)
      .select()
      .single();

    if (error) throw error;
    return mapRoomFromSupabase(data);
  },

  async addRoom(room: Room): Promise<Room> {
    const { data, error } = await supabase
      .from(TABLES.ROOMS)
      .insert({
        id: room.id,
        name: room.name,
        category_id: room.categoryId,
        category_name: room.categoryName,
        price: room.price,
        status: room.status,
        color: room.color,
        floor: room.floor,
        notes: room.notes
      })
      .select()
      .single();

    if (error) throw error;
    return mapRoomFromSupabase(data);
  },

  async deleteRoom(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.ROOMS)
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Image Upload to Supabase Storage
  async uploadImage(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('hotel-images')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('hotel-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },

  async deleteImage(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('hotel-images')
      .remove([path]);
    if (error) console.warn('Image delete failed:', error.message);
  },

  // Categories
  async getCategories(): Promise<RoomCategory[]> {
    const { data, error } = await supabase
      .from(TABLES.CATEGORIES)
      .select('*')
      .order('price', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapCategoryFromSupabase);
  },

  async updateCategory(category: RoomCategory): Promise<void> {
    const updateData: any = {
      name: category.name,
      price: category.price,
      color: category.color,
    };

    // Only include image_url if the field exists (migration has been run)
    // We always try to include it - if column doesn't exist Supabase will error
    updateData.image_url = category.image || null;

    const { error } = await supabase
      .from(TABLES.CATEGORIES)
      .update(updateData)
      .eq('id', category.id);

    if (error) {
      // If error is about missing column, give a clear message
      if (error.message?.includes('image_url') || error.code === '42703') {
        throw new Error('image_url column missing. Please run add-category-images.sql in Supabase first.');
      }
      throw error;
    }
  },

  // Guests
  async getGuests(): Promise<Guest[]> {
    const { data, error } = await supabase
      .from(TABLES.GUESTS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapGuestFromSupabase);
  },

  async upsertGuest(guest: Partial<Guest>): Promise<Guest> {
    const guestData = {
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      identification: guest.identification,
      identification_type: guest.identificationType,
      visits: guest.visits || 1,
      total_spent: guest.totalSpent || 0,
      last_visit: new Date().toISOString(),
      is_vip: guest.isVip || false,
      preferences: guest.preferences,
      notes: guest.notes
    };

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guest.id || '');

    // If we have a valid UUID, upsert by ID
    if (isUUID) {
      const { data, error } = await supabase
        .from(TABLES.GUESTS)
        .upsert({ ...guestData, id: guest.id }, { onConflict: 'id' })
        .select()
        .single();
      if (error) { console.error('❌ Supabase upsertGuest error:', error); throw error; }
      return mapGuestFromSupabase(data);
    }

    // Non-UUID ID (phone number, identification, etc.) - try to find existing guest first
    let existingId: string | null = null;
    if (guest.phone || guest.identification) {
      let query = supabase.from(TABLES.GUESTS).select('id').limit(1);
      if (guest.phone) query = query.eq('phone', guest.phone);
      else if (guest.identification) query = query.eq('identification', guest.identification);
      const { data: existing } = await query.maybeSingle();
      if (existing) existingId = existing.id;
    }

    if (existingId) {
      // Update existing record
      const { data, error } = await supabase
        .from(TABLES.GUESTS)
        .update(guestData)
        .eq('id', existingId)
        .select()
        .single();
      if (error) { console.error('❌ Supabase updateGuest error:', error); throw error; }
      return mapGuestFromSupabase(data);
    } else {
      // Insert new guest - let Supabase generate UUID
      const { data, error } = await supabase
        .from(TABLES.GUESTS)
        .insert(guestData)
        .select()
        .single();
      if (error) { console.error('❌ Supabase insertGuest error:', error); throw error; }
      console.log('✅ Guest inserted to Supabase:', data.id);
      return mapGuestFromSupabase(data);
    }
  },

  // Services
  async getServices(): Promise<ServiceItem[]> {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(mapServiceFromSupabase);
  },

  async updateService(service: ServiceItem): Promise<ServiceItem> {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .update({
        name: service.name,
        price: service.price,
        stock: service.stock,
        category: service.category,
        description: service.description
      })
      .eq('id', service.id)
      .select()
      .single();

    if (error) throw error;
    return mapServiceFromSupabase(data);
  },

  async addService(service: ServiceItem): Promise<ServiceItem> {
    const { data, error } = await supabase
      .from(TABLES.SERVICES)
      .insert({
        id: service.id,
        name: service.name,
        price: service.price,
        stock: service.stock || 0,
        category: service.category,
        description: service.description
      })
      .select()
      .single();

    if (error) throw error;
    return mapServiceFromSupabase(data);
  },

  async deleteService(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.SERVICES)
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async deleteGuest(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.GUESTS)
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    if (!data) {
      // Return default settings
      return {
        hotelName: 'Mirona Hotel',
        hotelPhone: '',
        hotelEmail: '',
        websiteUrl: '',
        currency: 'UGX',
        taxRate: 0,
        receiptFooter: '',
        exchangeRates: {}
      };
    }

    return {
      hotelName: data.hotel_name,
      hotelPhone: data.hotel_phone,
      hotelEmail: data.hotel_email,
      websiteUrl: data.website_url,
      currency: data.currency,
      taxRate: data.tax_rate,
      receiptFooter: data.receipt_footer,
      exchangeRates: data.exchange_rates || {}
    };
  },

  // Website Content
  async getWebsiteContent(): Promise<any> {
    const { data, error } = await supabase
      .from('website_settings')
      .select('*')
      .eq('id', 'main')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      id: 'main',
      heroTitle: data.hero_title || '',
      heroSubtitle: data.hero_subtitle || '',
      aboutTitle: data.about_title || '',
      aboutText: data.about_text || '',
      contactText: data.contact_text || '',
      showRooms: data.show_rooms ?? true,
      showServices: data.show_services ?? true,
      heroImage: data.hero_image_url || undefined,
      aboutImage: data.about_image_url || undefined,
      galleryImages: data.gallery_image_urls || []
    };
  },

  async updateWebsiteContent(content: any): Promise<void> {
    const { error } = await supabase
      .from('website_settings')
      .upsert({
        id: 'main',
        hero_title: content.heroTitle,
        hero_subtitle: content.heroSubtitle,
        about_title: content.aboutTitle,
        about_text: content.aboutText,
        contact_text: content.contactText,
        show_rooms: content.showRooms,
        show_services: content.showServices,
        hero_image_url: content.heroImage || null,
        about_image_url: content.aboutImage || null,
        gallery_image_urls: content.galleryImages || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
  },

  // Audit Logs
  async logAction(user: User, action: string, details: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.AUDIT_LOGS)
      .insert({
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
        action,
        details,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;
  },

  // Check if a room is available for given dates (server-side validation)
  async checkRoomAvailability(roomId: string, checkIn: string, checkOut: string, excludeBookingId?: string): Promise<boolean> {
    let query = supabase
      .from(TABLES.BOOKINGS)
      .select('id')
      .eq('room_id', roomId)
      .not('status', 'in', '("CANCELLED","CHECKED_OUT")')
      .lt('check_in_date', checkOut)
      .gt('check_out_date', checkIn);

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    if (error) throw error;
    // Room is available if no overlapping bookings found
    return (data || []).length === 0;
  },

  // Notifications (cross-device)
  async getNotifications(): Promise<any[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      timestamp: n.timestamp,
      read: n.read,
      targetRoles: n.target_roles || undefined
    }));
  },

  async addNotification(notif: any): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .upsert({
        id: notif.id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        timestamp: notif.timestamp,
        read: notif.read,
        target_roles: notif.targetRoles || null
      }, { onConflict: 'id' });
    if (error) throw error;
  },

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async clearNotifications(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .neq('id', ''); // delete all
    if (error) throw error;
  },

  subscribeToNotifications(callback: (notif: any) => void) {
    return supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new as any;
        callback({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          timestamp: n.timestamp,
          read: n.read,
          targetRoles: n.target_roles || undefined
        });
      })
      .subscribe();
  },

  // Real-time subscriptions
  subscribeToBookings(callback: (booking: Booking) => void) {
    return supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.BOOKINGS
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            callback(mapBookingFromSupabase(payload.new as Database['public']['Tables']['bookings']['Row']));
          }
        }
      )
      .subscribe();
  },

  subscribeToRooms(callback: (room: Room) => void) {
    return supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.ROOMS
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            callback(mapRoomFromSupabase(payload.new as Database['public']['Tables']['rooms']['Row']));
          }
        }
      )
      .subscribe();
  }
};
