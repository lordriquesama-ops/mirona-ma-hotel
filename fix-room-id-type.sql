-- Fix Room ID Type from UUID to TEXT
-- Run this in Supabase SQL Editor to fix the UUID error

-- Step 1: Drop dependent foreign keys
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_room_id_fkey;

-- Step 2: Drop and recreate rooms table with TEXT id
DROP TABLE IF EXISTS rooms CASCADE;

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

-- Step 3: Recreate indexes
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_category_id ON rooms(category_id);

-- Step 4: Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Step 5: Create permissive policy
CREATE POLICY "Allow all operations" ON rooms FOR ALL USING (true) WITH CHECK (true);

-- Step 6: Create trigger for updated_at
CREATE TRIGGER update_rooms_updated_at 
BEFORE UPDATE ON rooms 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Update bookings table to use TEXT for room_id
ALTER TABLE bookings ALTER COLUMN room_id TYPE TEXT;

-- Step 8: Recreate foreign key with TEXT
ALTER TABLE bookings 
ADD CONSTRAINT bookings_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Room ID type changed from UUID to TEXT';
  RAISE NOTICE '✅ Now you can use room IDs like: A1, A2, B1, etc.';
  RAISE NOTICE '🎉 Ready to create rooms!';
END $$;
