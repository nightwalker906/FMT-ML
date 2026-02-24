-- ============================================================================
-- Add class_code column to courses table
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- 1. Add the class_code column (unique, 6 characters)
ALTER TABLE courses
ADD COLUMN class_code VARCHAR(8) UNIQUE;

-- 2. Generate codes for existing courses (random 6-char alphanumeric)
UPDATE courses
SET class_code = UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6))
WHERE class_code IS NULL;

-- 3. Make it NOT NULL now that all rows have values
ALTER TABLE courses
ALTER COLUMN class_code SET NOT NULL;

-- 4. Set a default so new rows auto-generate a code
ALTER TABLE courses
ALTER COLUMN class_code SET DEFAULT UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));

-- 5. Create an index for fast lookups by class_code
CREATE INDEX IF NOT EXISTS idx_courses_class_code ON courses (class_code);

-- 6. (Optional) Create a function to generate unique codes automatically
CREATE OR REPLACE FUNCTION generate_unique_class_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(8);
  code_exists BOOLEAN;
BEGIN
  IF NEW.class_code IS NULL OR NEW.class_code = '' THEN
    LOOP
      -- Generate a random 6-character alphanumeric code
      new_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
      
      -- Check if it already exists
      SELECT EXISTS(SELECT 1 FROM courses WHERE class_code = new_code) INTO code_exists;
      
      -- Exit loop if unique
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    NEW.class_code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Attach trigger to auto-generate code on insert
DROP TRIGGER IF EXISTS trg_generate_class_code ON courses;
CREATE TRIGGER trg_generate_class_code
  BEFORE INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION generate_unique_class_code();
