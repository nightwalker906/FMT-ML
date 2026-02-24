-- ============================================================================
-- Ensure course_resources table exists & storage bucket policy
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- 1. Create course_resources table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.course_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for fast lookups by course
CREATE INDEX IF NOT EXISTS idx_course_resources_course_id ON public.course_resources(course_id);

-- 3. Enable RLS on course_resources
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;

-- 4. Allow anyone to read resources (students need to see them)
DROP POLICY IF EXISTS "Anyone can read course resources" ON public.course_resources;
CREATE POLICY "Anyone can read course resources"
  ON public.course_resources FOR SELECT
  USING (true);

-- 5. Allow authenticated users to insert resources (tutors upload)
DROP POLICY IF EXISTS "Authenticated users can insert course resources" ON public.course_resources;
CREATE POLICY "Authenticated users can insert course resources"
  ON public.course_resources FOR INSERT
  WITH CHECK (true);

-- 6. Allow authenticated users to delete resources
DROP POLICY IF EXISTS "Authenticated users can delete course resources" ON public.course_resources;
CREATE POLICY "Authenticated users can delete course resources"
  ON public.course_resources FOR DELETE
  USING (true);

-- ============================================================================
-- Storage bucket policies for "Class materials"
-- Make sure the bucket exists already (you created it manually)
-- These policies allow upload and public read access
-- Policies are RLS policies on the storage.objects table
-- ============================================================================

-- 7. Make the bucket public (allows public downloads)
UPDATE storage.buckets SET public = true WHERE id = 'Class materials';

-- 8. Allow anyone to read/download files from the bucket
DROP POLICY IF EXISTS "Public read Class materials" ON storage.objects;
CREATE POLICY "Public read Class materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'Class materials');

-- 9. Allow authenticated users to upload files
DROP POLICY IF EXISTS "Authenticated upload Class materials" ON storage.objects;
CREATE POLICY "Authenticated upload Class materials"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'Class materials' AND auth.role() = 'authenticated');

-- 10. Allow authenticated users to update files
DROP POLICY IF EXISTS "Authenticated update Class materials" ON storage.objects;
CREATE POLICY "Authenticated update Class materials"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'Class materials' AND auth.role() = 'authenticated');

-- 11. Allow authenticated users to delete files
DROP POLICY IF EXISTS "Authenticated delete Class materials" ON storage.objects;
CREATE POLICY "Authenticated delete Class materials"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'Class materials' AND auth.role() = 'authenticated');
