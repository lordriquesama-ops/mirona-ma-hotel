-- COMPLETE DATA RESET
-- Run this in Supabase SQL Editor to clear all transactional data
-- Preserves: rooms, room_categories, services, users, settings

-- Clear transactional data
DELETE FROM bookings;
DELETE FROM guests;
DELETE FROM expenses;
DELETE FROM audit_logs;
DELETE FROM notifications;

-- Verify counts
SELECT 'bookings' as table_name, COUNT(*) as remaining FROM bookings
UNION ALL
SELECT 'guests', COUNT(*) FROM guests
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- Show what's preserved
SELECT 'rooms' as table_name, COUNT(*) as count FROM rooms
UNION ALL
SELECT 'room_categories', COUNT(*) FROM room_categories
UNION ALL
SELECT 'services', COUNT(*) FROM services
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'settings', COUNT(*) FROM settings;
