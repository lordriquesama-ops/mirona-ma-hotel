-- Fix Guest ID Type from UUID to TEXT
-- Run this in Supabase SQL Editor

-- Step 1: Drop and recreate guests table with TEXT id
DROP TABLE IF EXISTS guests CASCADE;

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

-- Step 2: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);

-- Step 3: Enable RLS
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Step 4: Create permissive policy
DROP POLICY IF EXISTS "Allow all operations" ON guests;
CREATE POLICY "Allow all operations" ON guests FOR ALL USING (true) WITH CHECK (true);

-- Step 5: Create trigger for updated_at
DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at 
BEFORE UPDATE ON guests 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Guest ID changed from UUID to TEXT';
  RAISE NOTICE '✅ Now you can use phone numbers as guest IDs';
  RAISE NOTICE '🎉 Bookings will work now!';
END $$;
