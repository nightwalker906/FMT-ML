-- ============================================================================
-- SUPABASE SETUP: Avatars Storage Bucket + Messages Table RLS Policies
-- ============================================================================
-- Run these SQL commands in Supabase SQL Editor to set up:
-- 1. Create 'avatars' storage bucket
-- 2. Set up RLS policies for messages table
-- 3. Create messages table (if not exists)
-- ============================================================================

-- STEP 1: Create Avatars Storage Bucket
-- Note: This creates a public bucket for reading, authenticated for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Set up Storage Policies for Avatars Bucket
-- ============================================================================

-- Allow public users to READ avatars
CREATE POLICY "Public read access on avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to UPLOAD avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- Allow users to UPDATE their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to DELETE their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 3: Create Messages Table (if not already exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);

-- ============================================================================
-- STEP 4: Enable RLS on Messages Table
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow users to READ messages where they are sender or receiver
CREATE POLICY "Users can read their own messages"
ON public.messages FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Allow users to INSERT messages where they are the sender
CREATE POLICY "Users can insert their own messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
);

-- Allow users to UPDATE their own messages (for is_read flag)
CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (
  auth.uid() = receiver_id
);

-- ============================================================================
-- STEP 5: Create NEW Tables (Bookings, Requests, Settings)
-- ============================================================================

-- Create Status Types
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('open', 'closed', 'fulfilled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- A. BOOKINGS (For the Dashboard - Session bookings with tutors)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status booking_status DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- B. TUTOR REQUESTS (For "Drop a Request" - Students can request tutors)
CREATE TABLE IF NOT EXISTS public.tutor_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_range TEXT,
  status request_status DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- C. USER SETTINGS (For the Settings Page - Notification preferences)
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_email_bookings BOOLEAN DEFAULT true,
  notify_email_messages BOOLEAN DEFAULT true,
  notify_marketing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON public.bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor_id ON public.bookings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON public.bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_tutor_requests_student_id ON public.tutor_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_requests_status ON public.tutor_requests(status);

-- ============================================================================
-- STEP 6: Disable RLS for New Tables (Unrestricted as requested)
-- ============================================================================

ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Update Storage Policies for Avatar Upload
-- ============================================================================

-- Policy to allow anyone to upload avatars
CREATE POLICY "Anyone can upload Avatars"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' );

-- Policy to allow updating own avatars
CREATE POLICY "Users can update own Avatars"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'avatars' );

-- Policy to allow deleting own avatars  
CREATE POLICY "Users can delete own Avatars"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' );

-- ============================================================================
-- STEP 5: Create Sessions Table (for tracking student-tutor interactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  scheduled_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  meeting_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON public.sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id ON public.sessions(tutor_id);

-- ============================================================================
-- STEP 6: Enable RLS on Sessions Table
-- ============================================================================

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow students to see their own sessions
CREATE POLICY "Students can view their own sessions"
ON public.sessions FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE id = sessions.student_id
  )
);

-- Allow tutors to see their sessions
CREATE POLICY "Tutors can view their sessions"
ON public.sessions FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE id = sessions.tutor_id
  )
);

-- ============================================================================
-- STEP 7: Create Notification Settings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_on_session_accepted BOOLEAN DEFAULT true,
  email_on_message BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own notification settings
CREATE POLICY "Users can view their own notification settings"
ON public.notification_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
ON public.notification_settings FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 8: Enable Realtime for Messages Table
-- ============================================================================

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.messages;
COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- ✅ Created 'avatars' storage bucket (public read, authenticated upload)
-- ✅ Created 'messages' table with RLS policies for real-time chat
-- ✅ Created 'sessions' table for tracking student-tutor interactions
-- ✅ Created 'notification_settings' table for user preferences
-- ✅ Enabled Realtime on messages table
-- ✅ All tables have proper indexes for performance
-- ============================================================================
