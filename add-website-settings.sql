-- Run each block separately in Supabase SQL editor if needed

-- 1. Create table
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

-- 2. Insert default row
INSERT INTO website_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies if they exist
DROP POLICY IF EXISTS "Public read website settings" ON website_settings;
DROP POLICY IF EXISTS "Authenticated update website settings" ON website_settings;

-- 5. Allow public read
CREATE POLICY "Public read website settings"
ON website_settings FOR SELECT
USING (true);

-- 6. Allow updates
CREATE POLICY "Authenticated update website settings"
ON website_settings FOR UPDATE
USING (true)
WITH CHECK (true);
