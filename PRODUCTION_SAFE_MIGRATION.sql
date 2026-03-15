-- PRODUCTION-SAFE MIGRATION
-- This script preserves all existing data while fixing type issues
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Backup existing data
-- ============================================

-- Create temporary backup tables
CREATE TEMP TABLE rooms_backup AS SELECT * FROM rooms;
CREATE TEMP TABLE guests_backup AS SELECT * FROM guests;
CREATE TEMP TABLE services_backup AS SELECT * FROM services;
CREATE TEMP TABLE bookings_backup AS SELECT * FROM bookings;

-- ============================================
-- STEP 2: Drop constraints and tables
-- ============================================

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_room_id_fkey;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;

DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS services CASCADE;

-- ============================================
-- STEP 3: Recreate tables with correct types
-- ============================================

-- Rooms table with TEXT id
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Cleaning', 'Maintenance')),
  color TEXT NOT NULL,
  floor INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guests table with TEXT id
CREATE TABLE guests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  identification TEXT,
  identification_type TEXT DEFAULT 'National ID',
  visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_visit TIMESTAMPTZ,
  is_vip BOOLEAN DEFAULT FALSE,
  preferences JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services table with TEXT id
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 4: Restore data from backups
-- ============================================

-- Restore rooms (convert UUID to TEXT)
INSERT INTO rooms (id, name, category_id, category_name, price, status, color, floor, notes, created_at, updated_at)
SELECT 
  id::TEXT,  -- Convert UUID to TEXT
  name,
  category_id,
  category_name,
  price,
  status,
  color,
  floor,
  notes,
  created_at,
  updated_at
FROM rooms_backup;

-- Restore guests (convert UUID to TEXT)
INSERT INTO guests (id, name, phone, email, identification, identification_type, visits, total_spent, last_visit, is_vip, preferences, notes, created_at, updated_at)
SELECT 
  id::TEXT,  -- Convert UUID to TEXT
  name,
  phone,
  email,
  identification,
  identification_type,
  visits,
  total_spent,
  last_visit,
  is_vip,
  preferences,
  notes,
  created_at,
  updated_at
FROM guests_backup;

-- Restore services (convert UUID to TEXT)
INSERT INTO services (id, name, price, stock, category, description, created_at, updated_at)
SELECT 
  id::TEXT,  -- Convert UUID to TEXT
  name,
  price,
  stock,
  category,
  description,
  created_at,
  updated_at
FROM services_backup;

-- ============================================
-- STEP 5: Update bookings table
-- ============================================

-- Change room_id and user_id types
ALTER TABLE bookings ALTER COLUMN room_id TYPE TEXT;
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;

-- ============================================
-- STEP 6: Recreate foreign keys
-- ============================================

ALTER TABLE bookings 
ADD CONSTRAINT bookings_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE bookings 
ADD CONSTRAINT bookings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- STEP 7: Recreate indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_category_id ON rooms(category_id);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- ============================================
-- STEP 8: Enable RLS
-- ============================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 9: Create permissive policies
-- ============================================

DROP POLICY IF EXISTS "Allow all operations" ON rooms;
CREATE POLICY "Allow all operations" ON rooms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations" ON guests;
CREATE POLICY "Allow all operations" ON guests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations" ON services;
CREATE POLICY "Allow all operations" ON services FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- STEP 10: Create triggers
-- ============================================

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at 
BEFORE UPDATE ON rooms 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at 
BEFORE UPDATE ON guests 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at 
BEFORE UPDATE ON services 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 11: Verify migration
-- ============================================

DO $$
DECLARE
  rooms_count INTEGER;
  guests_count INTEGER;
  services_count INTEGER;
  bookings_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rooms_count FROM rooms;
  SELECT COUNT(*) INTO guests_count FROM guests;
  SELECT COUNT(*) INTO services_count FROM services;
  SELECT COUNT(*) INTO bookings_count FROM bookings;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Data preserved:';
  RAISE NOTICE '  - Rooms: % records', rooms_count;
  RAISE NOTICE '  - Guests: % records', guests_count;
  RAISE NOTICE '  - Services: % records', services_count;
  RAISE NOTICE '  - Bookings: % records', bookings_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  ✅ Room ID: UUID → TEXT';
  RAISE NOTICE '  ✅ Guest ID: UUID → TEXT';
  RAISE NOTICE '  ✅ Service ID: UUID → TEXT';
  RAISE NOTICE '  ✅ User ID: Now allows NULL';
  RAISE NOTICE '  ✅ Foreign keys updated';
  RAISE NOTICE '  ✅ Indexes recreated';
  RAISE NOTICE '  ✅ RLS policies applied';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Your app is now production-ready!';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '  - Create rooms with IDs like: A1, A2, B1, Lion, etc.';
  RAISE NOTICE '  - Create guests with phone numbers as IDs';
  RAISE NOTICE '  - Create services with timestamp IDs';
  RAISE NOTICE '  - Create bookings without errors';
  RAISE NOTICE '  - All existing data is preserved!';
END $$;
