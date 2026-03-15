import { createClient } from '@supabase/supabase-js';

// Anon key is safe to expose in frontend (it's public by design)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wyelzqqqmrkwqtduqamf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWx6cXFxbXJrd3F0ZHVxYW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTgwMzgsImV4cCI6MjA4ODYzNDAzOH0.syKfjzt3_WpPE7KXeJqUM8B5oV5k86A1x2fLybDUjtA';

export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 10 } },
  db: { schema: 'public' }
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 10 } }
});

// Database table names matching your current structure
export const TABLES = {
  USERS: 'users',
  BOOKINGS: 'bookings',
  ROOMS: 'rooms',
  CATEGORIES: 'categories',
  GUESTS: 'guests',
  SERVICES: 'services',
  EXPENSES: 'expenses',
  SETTINGS: 'settings',
  AUDIT_LOGS: 'audit_logs',
  SHIFTS: 'shifts'
};

// Type definitions for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          name: string;
          role: 'ADMIN' | 'MANAGER' | 'RECEPTION' | 'MARKETING';
          avatar_color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      bookings: {
        Row: {
          id: string;
          booking_number: string;
          guest_name: string;
          phone: string;
          email: string | null;
          identification: string | null;
          identification_type: string | null;
          room_id: string;
          room_name: string;
          room_price: number;
          check_in_date: string;
          check_out_date: string;
          adults: number;
          children: number;
          guests: number;
          amount: number;
          paid_amount: number;
          payment_method: string | null;
          status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
          notes: string | null;
          charges: any | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'booking_number' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          category_id: string;
          category_name: string;
          price: number;
          status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';
          color: string;
          floor: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          price: number;
          prefix: string;
          count: number;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      guests: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string | null;
          identification: string | null;
          identification_type: string | null;
          visits: number;
          total_spent: number;
          last_visit: string | null;
          is_vip: boolean;
          preferences: any | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['guests']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['guests']['Insert']>;
      };
      services: {
        Row: {
          id: string;
          name: string;
          price: number;
          stock: number;
          category: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      expenses: {
        Row: {
          id: string;
          description: string;
          amount: number;
          category: string;
          date: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
      };
      settings: {
        Row: {
          id: string;
          hotel_name: string;
          hotel_phone: string;
          hotel_email: string;
          website_url: string;
          currency: string;
          tax_rate: number;
          receipt_footer: string;
          exchange_rates: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['settings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['settings']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: number;
          user_id: string;
          user_name: string;
          user_role: string;
          action: string;
          details: string;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
      shifts: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          role: string;
          shift_type: string;
          start_time: string;
          end_time: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shifts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['shifts']['Insert']>;
      };
    };
  };
}

// Helper function to generate booking number
export const generateBookingNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${timestamp}-${random}`;
};

// Real-time subscription helper
export const subscribeToTable = <T extends keyof Database['public']['Tables']>(
  table: T,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table
      },
      callback
    )
    .subscribe();
};

// Authentication helpers
export const signIn = async (username: string, password: string) => {
  // For now, use the existing user system with Supabase auth
  // In future, this can be migrated to Supabase Auth
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    throw new Error('User not found');
  }

  // Simple password check (in production, use proper hashing)
  if (password === 'password123') { // This is temporary - use proper auth
    return data;
  }

  throw new Error('Invalid credentials');
};

export const signOut = async () => {
  await supabase.auth.signOut();
};
