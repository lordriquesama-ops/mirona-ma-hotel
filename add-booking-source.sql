-- Add source column to bookings table to track where bookings come from
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin' 
CHECK (source IN ('admin', 'website', 'phone', 'walkin'));

-- Add comment
COMMENT ON COLUMN bookings.source IS 'Source of the booking: admin (dashboard), website (public site), phone (phone booking), walkin (walk-in guest)';

-- Update existing bookings to have 'admin' as source
UPDATE bookings SET source = 'admin' WHERE source IS NULL;
