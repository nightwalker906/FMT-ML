-- ============================================================
-- Add last_seen column to profiles table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add last_seen column (timestamp with timezone, nullable)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NULL;

-- Initialize last_seen for users who are currently "online" to now
UPDATE profiles 
SET last_seen = NOW() 
WHERE is_online = true;

-- Optional: Create an index for efficient last_seen queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);
