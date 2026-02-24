-- ============================================================================
-- Assignment & Submission System
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- 1. Add resource_type and due_date columns to course_resources
ALTER TABLE public.course_resources
  ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'material',
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ DEFAULT NULL;

-- 2. Create student_submissions table
CREATE TABLE IF NOT EXISTS public.student_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.course_resources(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  grade DECIMAL(5,2) DEFAULT NULL,
  feedback TEXT DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'submitted'
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_student_submissions_resource ON public.student_submissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_student ON public.student_submissions(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_submission ON public.student_submissions(resource_id, student_id);

-- 4. Enable RLS
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for student_submissions
DROP POLICY IF EXISTS "Anyone can read submissions" ON public.student_submissions;
CREATE POLICY "Anyone can read submissions"
  ON public.student_submissions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Students can insert own submissions" ON public.student_submissions;
CREATE POLICY "Students can insert own submissions"
  ON public.student_submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own submissions" ON public.student_submissions;
CREATE POLICY "Students can update own submissions"
  ON public.student_submissions FOR UPDATE
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Authenticated can update submissions" ON public.student_submissions;
CREATE POLICY "Authenticated can update submissions"
  ON public.student_submissions FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Students can delete own submissions" ON public.student_submissions;
CREATE POLICY "Students can delete own submissions"
  ON public.student_submissions FOR DELETE
  USING (auth.uid() = student_id);

-- ============================================================================
-- Storage policies for "student material" bucket
-- ============================================================================

-- 6. Make the bucket public for downloads
UPDATE storage.buckets SET public = true WHERE id = 'student material';

-- 7. Allow anyone to read/download student submissions
DROP POLICY IF EXISTS "Public read student material" ON storage.objects;
CREATE POLICY "Public read student material"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student material');

-- 8. Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated upload student material" ON storage.objects;
CREATE POLICY "Authenticated upload student material"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student material' AND auth.role() = 'authenticated');

-- 9. Allow authenticated users to update
DROP POLICY IF EXISTS "Authenticated update student material" ON storage.objects;
CREATE POLICY "Authenticated update student material"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'student material' AND auth.role() = 'authenticated');

-- 10. Allow authenticated users to delete own submissions
DROP POLICY IF EXISTS "Authenticated delete student material" ON storage.objects;
CREATE POLICY "Authenticated delete student material"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'student material' AND auth.role() = 'authenticated');
