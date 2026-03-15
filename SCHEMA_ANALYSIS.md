# 📊 FRONTEND → BACKEND DATA FLOW ANALYSIS

## 🔄 Exact Data Flow

### 1️⃣ **Frontend Form Data (formData)**
```typescript
{
  guestName: string,
  email: string,
  phone: string,
  identification: string,
  identificationType: string,
  categoryId: string,
  roomNumbers: string[],
  checkIn: string,           // YYYY-MM-DD format
  checkOut: string,          // YYYY-MM-DD format
  guests: number,
  status: 'CONFIRMED',
  paymentMethod: string,
  amount: number,
  paidAmount: number,
  isManualAmount: boolean,
  notes: string
}
```

### 2️⃣ **Frontend Booking Object (sent to API)**
```typescript
{
  id: string,
  guestName: string,
  email: string,
  phone: string,
  identification: string,
  identificationType: string,
  roomType: string,          // Category name
  roomNumber: string,        // Room ID
  checkIn: string,           // YYYY-MM-DD format
  checkOut: string,          // YYYY-MM-DD format
  guests: number,
  amount: number,
  paidAmount: number,
  status: 'CONFIRMED'|'PENDING'|'CHECKED_IN'|'CHECKED_OUT'|'CANCELLED',
  paymentMethod: string,
  notes: string,
  date: string,              // ISO timestamp
  charges: ChargeItem[]
}
```

### 3️⃣ **API Call**
```typescript
// POST /api/bookings
await api.post(ENDPOINTS.BOOKINGS, booking);
```

### 4️⃣ **Backend Schema (current)**
```typescript
{
  // Frontend fields
  id?: string,
  guestName: string,
  email?: string,
  phone: string,
  identification?: string,
  identificationType?: string,
  roomType?: string,
  roomNumber?: string,
  checkIn: string,
  checkOut: string,
  guests: number,
  amount: number,
  paidAmount?: number,
  status: BookingStatus,
  paymentMethod?: string,
  notes?: string,
  charges?: ChargeItem[],
  
  // Backend fields
  roomId?: string,
  roomName?: string,
  roomPrice?: number,
  checkInDate?: string,
  checkOutDate?: string,
  adults?: number,
  children?: number,
  userId?: string,
  bookingNumber?: string
}
```

### 5️⃣ **Database Schema (Prisma)**
```prisma
model Booking {
  id                   String        @id @default(uuid())
  bookingNumber        String        @unique
  guestName            String
  phone                String
  email                String?
  identification       String?
  identificationType   String?
  roomId               String
  roomName             String
  roomPrice            Float
  checkInDate          DateTime
  checkOutDate         DateTime
  adults               Int           @default(2)
  children             Int           @default(0)
  guests               Int           @default(1)
  amount               Float
  paidAmount           Float         @default(0)
  paymentMethod        String?
  status               BookingStatus @default(PENDING)
  notes                String?
  charges              Json?
  userId               String
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
  
  // Relations
  user                 User          @relation(fields: [userId], references: [id])
  room                 Room          @relation(fields: [roomId], references: [id])
  guest                Guest         @relation(fields: [phone], references: [phone])
  transactions         Transaction[]
}
```

## 🔍 **CRITICAL ISSUES IDENTIFIED**

### ❌ **Field Name Mismatches:**
| Frontend | Backend | Database | Issue |
|----------|---------|----------|-------|
| `roomNumber` | `roomId` | `roomId` | ✅ Mapped |
| `roomType` | `roomName` | `roomName` | ✅ Mapped |
| `checkIn` | `checkInDate` | `checkInDate` | ✅ Mapped |
| `checkOut` | `checkOutDate` | `checkOutDate` | ✅ Mapped |
| `guests` | `adults` | `adults` | ✅ Mapped |

### ❌ **Missing Required Fields:**
- `bookingNumber` - Generated in backend ✅
- `userId` - Added from auth ✅
- `children` - Defaults to 0 ✅

### ❌ **Data Type Issues:**
- Frontend sends `checkIn` as string (YYYY-MM-DD)
- Database expects `DateTime` object ✅ Converted

### ❌ **Foreign Key Constraints:**
- `guest` table requires guest with matching `phone` ✅ Created automatically
- `room` table requires room with matching `roomId` ✅ Validated
- `user` table requires user with matching `userId` ✅ From auth

## ✅ **CURRENT MAPPING LOGIC (Backend)**
```typescript
const mappedData = {
  guestName: data.guestName,
  phone: data.phone,
  email: data.email,
  identification: data.identification,
  identificationType: data.identificationType,
  roomId: data.roomId || data.roomNumber,        // ✅ Mapped
  roomName: data.roomName || data.roomType,      // ✅ Mapped
  roomPrice: data.roomPrice || data.amount,      // ✅ Mapped
  checkInDate: data.checkInDate || data.checkIn, // ✅ Mapped
  checkOutDate: data.checkOutDate || data.checkOut, // ✅ Mapped
  adults: data.adults || data.guests || 2,       // ✅ Mapped
  children: data.children || 0,
  guests: data.guests || 1,
  amount: data.amount,
  paidAmount: data.paidAmount || 0,
  paymentMethod: data.paymentMethod,
  status: data.status,
  notes: data.notes,
  charges: data.charges,
  userId: data.userId || req.user!.id,
  bookingNumber: bookingNumber
};
```

## 🎯 **SUPABASE SCHEMA RECOMMENDATION**

### **Option 1: Keep Current Schema (Recommended)**
```sql
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_number TEXT UNIQUE,
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  identification TEXT,
  identification_type TEXT,
  room_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  room_price FLOAT NOT NULL,
  check_in_date TIMESTAMPTZ NOT NULL,
  check_out_date TIMESTAMPTZ NOT NULL,
  adults INTEGER DEFAULT 2,
  children INTEGER DEFAULT 0,
  guests INTEGER DEFAULT 1,
  amount FLOAT NOT NULL,
  paid_amount FLOAT DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'PENDING',
  notes TEXT,
  charges JSONB,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Option 2: Simplified Schema (Frontend-friendly)**
```sql
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  guest_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  identification TEXT,
  identification_type TEXT,
  room_type TEXT NOT NULL,
  room_number TEXT NOT NULL,
  check_in TEXT NOT NULL,      -- Keep as string for frontend compatibility
  check_out TEXT NOT NULL,     -- Keep as string for frontend compatibility
  guests INTEGER DEFAULT 1,
  amount FLOAT NOT NULL,
  paid_amount FLOAT DEFAULT 0,
  status TEXT DEFAULT 'CONFIRMED',
  payment_method TEXT,
  notes TEXT,
  charges JSONB,
  date TEXT DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 **MIGRATION STRATEGY**

### **Step 1: Choose Schema**
- **Option 1**: Keep current database schema, map in Supabase functions
- **Option 2**: Simplify schema to match frontend exactly

### **Step 2: Create Supabase Tables**
- Use SQL editor in Supabase dashboard
- Create tables with chosen schema
- Set up Row Level Security policies

### **Step 3: Migrate Data**
- Export from PostgreSQL
- Import to Supabase
- Verify data integrity

### **Step 4: Update Frontend**
- Replace API calls with Supabase client
- Remove IndexedDB sync logic
- Add real-time subscriptions

## 📋 **NEXT STEPS**

1. **Choose schema option** (recommend Option 1 for data integrity)
2. **Set up Supabase project**
3. **Create tables and policies**
4. **Test data insertion**
5. **Update frontend code**

**Current backend mapping is actually working correctly - the schema alignment is good!**
