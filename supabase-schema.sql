-- Supabase Schema for Mirona Hotel Management System
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'RECEPTION', 'MARKETING')),
  avatar_color TEXT NOT NULL DEFAULT 'bg-gray-600',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  prefix TEXT NOT NULL,
  count INTEGER NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- Guests Table
CREATE TABLE IF NOT EXISTS guests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  identification TEXT UNIQUE,
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

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_number TEXT UNIQUE NOT NULL,
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  identification TEXT,
  identification_type TEXT,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_price DECIMAL(10,2) NOT NULL,
  check_in_date TIMESTAMPTZ NOT NULL,
  check_out_date TIMESTAMPTZ NOT NULL,
  adults INTEGER DEFAULT 2,
  children INTEGER DEFAULT 0,
  guests INTEGER DEFAULT 1,
  amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW')),
  notes TEXT,
  charges JSONB,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hotel_name TEXT NOT NULL DEFAULT 'Mirona Hotel',
  hotel_phone TEXT,
  hotel_email TEXT,
  website_url TEXT,
  currency TEXT DEFAULT 'UGX',
  tax_rate DECIMAL(5,2) DEFAULT 0,
  receipt_footer TEXT,
  exchange_rates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  shift_type TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out ON bookings(check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_category_id ON rooms(category_id);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs("timestamp");
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read all users but only update their own profile
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Bookings - authenticated users can do everything
CREATE POLICY "Authenticated users can manage bookings" ON bookings FOR ALL USING (auth.role() = 'authenticated');

-- Rooms - authenticated users can read and update
CREATE POLICY "Authenticated users can view rooms" ON rooms FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update rooms" ON rooms FOR UPDATE USING (auth.role() = 'authenticated');

-- Guests - authenticated users can manage
CREATE POLICY "Authenticated users can manage guests" ON guests FOR ALL USING (auth.role() = 'authenticated');

-- Services - authenticated users can manage
CREATE POLICY "Authenticated users can manage services" ON services FOR ALL USING (auth.role() = 'authenticated');

-- Expenses - authenticated users can manage
CREATE POLICY "Authenticated users can manage expenses" ON expenses FOR ALL USING (auth.role() = 'authenticated');

-- Settings - authenticated users can read and update
CREATE POLICY "Authenticated users can manage settings" ON settings FOR ALL USING (auth.role() = 'authenticated');

-- Audit logs - authenticated users can read and insert
CREATE POLICY "Authenticated users can manage audit logs" ON audit_logs FOR ALL USING (auth.role() = 'authenticated');

-- Shifts - authenticated users can manage
CREATE POLICY "Authenticated users can manage shifts" ON shifts FOR ALL USING (auth.role() = 'authenticated');

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
INSERT INTO users (username, name, role, avatar_color) VALUES
  ('admin', 'Sarah Jenkins', 'ADMIN', 'bg-purple-600'),
  ('manager', 'David Okello', 'MANAGER', 'bg-teal-600'),
  ('reception', 'Grace Nakato', 'RECEPTION', 'bg-orange-600'),
  ('marketing', 'Alex Muli', 'MARKETING', 'bg-pink-600');

INSERT INTO categories (name, price, prefix, count, color) VALUES
  ('Presidential', 50000.00, 'A', 8, 'bg-slate-800'),
  ('Suites', 30000.00, 'B', 12, 'bg-amber-700'),
  ('Deluxe', 20000.00, 'C', 10, 'bg-gray-500'),
  ('Safari', 10000.00, 'D', 8, 'bg-green-700');

-- Insert default settings
INSERT INTO settings (hotel_name, hotel_phone, hotel_email, website_url, currency, tax_rate, receipt_footer, exchange_rates) VALUES
  ('Mirona Hotel', '+256-123-456-789', 'info@mironahotel.com', 'https://mironahotel.com', 'UGX', 18.00, 'Thank you for choosing Mirona Hotel!', '{"USD": 3800, "EUR": 4100, "GBP": 4700}');

-- Function to generate booking numbers
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := to_char(NOW(), 'YYMMDDHH24MISS');
  random_part := substring(md5(random()::text), 1, 4);
  RETURN 'BK-' || timestamp_part || '-' || upper(random_part);
END;
$$ LANGUAGE plpgsql;
