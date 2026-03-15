-- Create a service role key to bypass RLS
-- Run this in your Supabase SQL Editor first

-- Generate a secure service role key
SELECT gen_random_uuid() as service_key;

-- Insert the service role key
INSERT INTO pgrst_config (version, key, value)
VALUES (
  '1.0',
  'service_role',
  service_key
) ON CONFLICT (version, key) DO UPDATE SET value = EXCLUDED.value;

-- Grant service role permissions
GRANT pg_signal_backend TO service_role;

-- Verify the service role key
SELECT * FROM pgrst_config WHERE key = 'service_role';
