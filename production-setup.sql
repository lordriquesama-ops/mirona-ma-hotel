-- ============================================================
-- MIRONA HOTEL - PRODUCTION SETUP SQL
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- 1. BOOKING SOURCE COLUMN
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin'
  CHECK (source IN ('admin', 'website', 'phone', 'walkin'));
UPDATE bookings SET source = 'admin' WHERE source IS NULL;

-- 2. CATEGORY IMAGE COLUMN
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. WEBSITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS website_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  hero_title TEXT DEFAULT 'Experience Luxury in Serenity',
  hero_subtitle TEXT DEFAULT 'Discover the perfect blend of comfort, style, and hospitality.',
  about_title TEXT DEFAULT 'Welcome to Our Hotel',
  about_text TEXT DEFAULT 'Located in the heart of the city, we offer world-class accommodation.',
  contact_text TEXT DEFAULT 'We look forward to hosting you.',
  show_rooms BOOLEAN DEFAULT TRUE,
  show_services BOOLEAN DEFAULT TRUE,
  hero_image_url TEXT,
  about_image_url TEXT,
  gallery_image_urls JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO website_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- 4. STORAGE BUCKET (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hotel-images', 'hotel-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. RLS - WEBSITE SETTINGS
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read website settings" ON website_settings;
DROP POLICY IF EXISTS "Authenticated update website settings" ON website_settings;
DROP POLICY IF EXISTS "Allow insert website settings" ON website_settings;
CREATE POLICY "Public read website settings" ON website_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated update website settings" ON website_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow insert website settings" ON website_settings FOR INSERT WITH CHECK (true);

-- 6. RLS - STORAGE POLICIES
DROP POLICY IF EXISTS "Public read hotel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload hotel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage hotel images" ON storage.objects;
CREATE POLICY "Public read hotel images" ON storage.objects FOR SELECT USING (bucket_id = 'hotel-images');
CREATE POLICY "Authenticated upload hotel images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hotel-images');
CREATE POLICY "Authenticated manage hotel images" ON storage.objects FOR DELETE USING (bucket_id = 'hotel-images');

-- 7. RLS - CORE TABLES (ensure all are enabled)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies first
DROP POLICY IF EXISTS "Allow all bookings" ON bookings;
DROP POLICY IF EXISTS "Allow all rooms" ON rooms;
DROP POLICY IF EXISTS "Allow all categories" ON categories;
DROP POLICY IF EXISTS "Allow all guests" ON guests;
DROP POLICY IF EXISTS "Allow all services" ON services;
DROP POLICY IF EXISTS "Allow all users" ON users;
DROP POLICY IF EXISTS "Allow all audit_logs" ON audit_logs;

-- Bookings: public can insert (website bookings), authenticated can do everything
CREATE POLICY "Public insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow update bookings" ON bookings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete bookings" ON bookings FOR DELETE USING (true);

-- Rooms: public read (for availability), authenticated write
CREATE POLICY "Public read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow write rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update rooms" ON rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete rooms" ON rooms FOR DELETE USING (true);

-- Categories: public read (for website), authenticated write
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow write categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update categories" ON categories FOR UPDATE USING (true) WITH CHECK (true);

-- Guests: authenticated only
CREATE POLICY "Allow all guests" ON guests FOR ALL USING (true) WITH CHECK (true);

-- Services: public read, authenticated write
CREATE POLICY "Public read services" ON services FOR SELECT USING (true);
CREATE POLICY "Allow write services" ON services FOR ALL USING (true) WITH CHECK (true);

-- Users: authenticated only
CREATE POLICY "Allow all users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Audit logs: authenticated write, read
CREATE POLICY "Allow all audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
