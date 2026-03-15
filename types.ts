
export type Role = 'ADMIN' | 'MANAGER' | 'RECEPTION' | 'MARKETING';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: Role;
  avatarColor: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: string;
  read: boolean;
  targetRoles?: Role[]; // If null, visible to all
}

export interface KPI {
  label: string;
  value: string;
  trend: number; // percentage
  trendDirection: 'up' | 'down';
  icon: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  performance: number;
  avatarUrl?: string;
}

export interface ChargeItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  qty: number;
}

export interface Booking {
  id: string;
  guestName: string;
  roomType: string;
  amount: number;
  status: 'CONFIRMED' | 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
  paymentMethod?: 'Cash' | 'Mobile Money' | 'Card' | 'Bank Transfer' | 'Credit' | 'Pending';
  date: string;
  checkIn?: string;
  checkOut?: string;
  roomNumber?: string;
  email?: string;
  phone?: string;
  identification?: string; // The ID Number
  identificationType?: string; // e.g., 'Passport', 'National ID'
  guests?: number;
  notes?: string;
  charges?: ChargeItem[]; // Extra services added to the bill
  paidAmount?: number; // Total amount paid so far
  source?: 'admin' | 'website' | 'phone' | 'walkin'; // Where the booking came from
  // Backend compatibility fields
  roomId?: string;
  roomName?: string;
  roomPrice?: number;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
  userId?: string;
  bookingNumber?: string;
}

export interface RoomStatus {
  clean: number;
  dirty: number;
  occupied: number;
  maintenance: number;
}

export interface AuditLogEntry {
  id?: number;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  details: string;
  timestamp: string;
}

export interface RoomCategory {
  id: string;
  name: string;
  price: number;
  prefix: string; // 'A', 'B', 'C' or 'Animals'
  count: number;
  color: string;
  image?: string; // base64 or URL for the category photo
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  category: string; // Changed from strict enum to string for flexibility
  description?: string;
  stock?: number;
  trackStock?: boolean;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: 'Utilities' | 'Supplies' | 'Maintenance' | 'Salaries' | 'Marketing' | 'Other';
  amount: number;
  description: string;
  recordedBy: string; // userId
  recordedByName: string;
}

export interface SystemSettings {
  hotelName: string;
  hotelPhone: string;
  hotelEmail: string;
  websiteUrl?: string;
  currency: string; // Base Currency (UGX)
  taxRate: number;
  receiptFooter: string;
  exchangeRates: {
      [key: string]: number; // e.g., 'USD': 3700
  };
}

export interface Shift {
  id: string;
  userId: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  type: 'Morning' | 'Afternoon' | 'Night' | 'Off';
}

export interface Room {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string; // denormalized for ease
  price: number;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';
  color: string;
  floor?: number;
  notes?: string;
}

export interface Guest {
    id: string; // ID number or Phone
    name: string;
    phone: string;
    email: string;
    identification: string;
    identificationType: string;
    visits: number;
    totalSpent: number;
    lastVisit: string;
    isVip: boolean;
    preferences?: any;
    notes?: string;
}

export interface WebsiteContent {
  id: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText: string;
  showRooms: boolean;
  showServices: boolean;
  contactText: string;
  heroImage?: string;      // base64 or URL
  aboutImage?: string;     // base64 or URL
  galleryImages?: string[]; // array of base64 or URLs
}

export interface SyncItem {
  id: string; // Unique ID for the sync item
  storeName: string; // The IndexedDB store name
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any; // The actual record data
  timestamp: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
  lastError?: string;
}
