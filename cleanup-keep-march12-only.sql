-- SQL Script to delete all data NOT from March 12, 2026
-- This will keep ONLY data from March 12, 2026
-- Run this in Supabase SQL Editor

-- WARNING: This will permanently delete data. Make sure you have a backup!

BEGIN;

-- 1. Delete bookings NOT from March 12, 2026
DELETE FROM bookings 
WHERE created_at::date != '2026-03-12';

-- 2. Delete expenses NOT from March 12, 2026
DELETE FROM expenses 
WHERE date::date != '2026-03-12';

-- 3. Delete audit logs NOT from March 12, 2026
DELETE FROM audit_logs 
WHERE log_timestamp::date != '2026-03-12';

-- 4. Delete orphaned guests (guests without any bookings from March 12)
DELETE FROM guests 
WHERE id NOT IN (
    SELECT DISTINCT g.id 
    FROM guests g
    INNER JOIN bookings b ON (
        g.phone = b.phone 
        OR g.identification = b.identification 
        OR LOWER(g.name) = LOWER(b.guest_name)
    )
    WHERE b.created_at::date = '2026-03-12'
);

-- Show remaining data counts
SELECT 
    'Bookings' as table_name, 
    COUNT(*) as remaining_records 
FROM bookings
UNION ALL
SELECT 
    'Guests' as table_name, 
    COUNT(*) as remaining_records 
FROM guests
UNION ALL
SELECT 
    'Expenses' as table_name, 
    COUNT(*) as remaining_records 
FROM expenses
UNION ALL
SELECT 
    'Audit Logs' as table_name, 
    COUNT(*) as remaining_records 
FROM audit_logs;

COMMIT;

-- Success message
SELECT '✅ Cleanup completed! All data now reflects March 12, 2026 only.' as status;
