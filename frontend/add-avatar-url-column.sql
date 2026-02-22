-- ============================================================================
-- Migration: Add avatar_url column to profiles table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add avatar_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN profiles.avatar_url IS 'URL to the user profile picture stored in Supabase Storage (profile picture bucket)';

-- Create RLS policies for the "profile picture" storage bucket (if not already set up)
-- These ensure users can only manage their own profile pictures

-- Allow public read access to profile pictures
INSERT INTO storage.policies (name, bucket_id, definition, check_expression)
SELECT 
  'Public read access for profile pictures',
  'profile picture',
  '(true)',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies 
  WHERE bucket_id = 'profile picture' AND name = 'Public read access for profile pictures'
);

-- If the above INSERT doesn't work with your Supabase version, 
-- use these SQL commands instead in the Supabase Dashboard → Storage → Policies:
--
-- SELECT: (bucket_id = 'profile picture')  → Allow for all users (public read)
-- INSERT: (bucket_id = 'profile picture' AND auth.uid()::text = (storage.foldername(name))[1])  → Authenticated users, own folder only
-- UPDATE: (bucket_id = 'profile picture' AND auth.uid()::text = (storage.foldername(name))[1])  → Authenticated users, own folder only
-- DELETE: (bucket_id = 'profile picture' AND auth.uid()::text = (storage.foldername(name))[1])  → Authenticated users, own folder only
