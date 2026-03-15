-- Fix RLS Policies for Supabase
-- Run this AFTER running supabase-schema.sql if you have RLS issues

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Authenticated users can manage bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can view rooms" ON rooms;
DROP POLICY IF EXISTS "Authenticated users can update rooms" ON rooms;
DROP POLICY IF EXISTS "Authenticated users can manage guests" ON guests;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON services;
DROP POLICY IF EXISTS "Authenticated users can manage expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can manage audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can manage shifts" ON shifts;

-- Create permissive policies that allow anon key access
-- This is needed because the app uses the anon key, not user auth

-- Users - Allow all operations with anon key
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Bookings - Allow all operations
CREATE POLICY "Allow all operations on bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- Rooms - Allow all operations
CREATE POLICY "Allow all operations on rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

-- Categories - Allow all operations
CREATE POLICY "Allow all operations on categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Guests - Allow all operations
CREATE POLICY "Allow all operations on guests" ON guests FOR ALL USING (true) WITH CHECK (true);

-- Services - Allow all operations
CREATE POLICY "Allow all operations on services" ON services FOR ALL USING (true) WITH CHECK (true);

-- Expenses - Allow all operations
CREATE POLICY "Allow all operations on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- Settings - Allow all operations
CREATE POLICY "Allow all operations on settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Audit logs - Allow all operations
CREATE POLICY "Allow all operations on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Shifts - Allow all operations
CREATE POLICY "Allow all operations on shifts" ON shifts FOR ALL USING (true) WITH CHECK (true);

-- Verify policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
