-- Run each block separately in Supabase SQL editor if needed

-- 1. Add image_url column to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create storage bucket (public) - update if already exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('hotel-images', 'hotel-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Drop old storage policies
DROP POLICY IF EXISTS "Public read hotel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload hotel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage hotel images" ON storage.objects;

-- 4. Allow public read
CREATE POLICY "Public read hotel images"
ON storage.objects FOR SELECT
USING (bucket_id = 'hotel-images');

-- 5. Allow uploads
CREATE POLICY "Authenticated upload hotel images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'hotel-images');

-- 6. Allow deletes
CREATE POLICY "Authenticated manage hotel images"
ON storage.objects FOR DELETE
USING (bucket_id = 'hotel-images');
