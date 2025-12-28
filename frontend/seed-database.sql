-- ============================================================================
-- SEED DATABASE: 50 Tutors + 100 Students
-- Run this in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Temporarily disable the foreign key constraint on profiles
-- (profiles.id references auth.users.id)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- First, let's create some realistic data arrays
DO $$
DECLARE
  -- Arrays for generating realistic data
  first_names TEXT[] := ARRAY['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 
    'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
    'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
    'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
    'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Timothy', 'Deborah',
    'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia',
    'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna',
    'Stephen', 'Brenda', 'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen',
    'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra', 'Frank', 'Rachel',
    'Alexander', 'Carolyn', 'Patrick', 'Janet', 'Jack', 'Catherine', 'Dennis', 'Maria', 'Jerry', 'Heather'];
  
  last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];

  subjects TEXT[] := ARRAY['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science', 
    'Economics', 'Business Studies', 'Accounting', 'Statistics', 'Calculus', 'Algebra', 'Literature', 'Writing',
    'Spanish', 'French', 'German', 'Psychology', 'Sociology', 'Philosophy', 'Art', 'Music'];

  teaching_styles TEXT[] := ARRAY[
    'I believe in a hands-on, interactive approach where students learn by doing.',
    'My teaching style focuses on building strong fundamentals before advancing.',
    'I adapt my methods to each student''s unique learning style and pace.',
    'I use real-world examples to make complex concepts easy to understand.',
    'My approach combines visual aids, practice problems, and conceptual discussions.',
    'I focus on developing critical thinking skills alongside subject knowledge.',
    'I create a supportive environment where students feel comfortable asking questions.',
    'My method emphasizes understanding over memorization for lasting knowledge.'
  ];

  bio_templates TEXT[] := ARRAY[
    'Passionate educator with %s years of experience helping students achieve their academic goals. Specialized in %s.',
    'Dedicated tutor focused on making %s accessible and engaging. %s years of proven success.',
    'Experienced %s tutor committed to student success. Teaching for %s years with excellent results.',
    'Professional educator specializing in %s with %s years of experience. Patient and thorough approach.',
    'Skilled tutor in %s with %s years of teaching experience. Helping students build confidence and skills.'
  ];

  learning_goals TEXT[] := ARRAY[
    'Improve grades and academic performance',
    'Prepare for university entrance exams',
    'Build strong foundation in core subjects',
    'Develop better study habits and techniques',
    'Gain confidence in challenging subjects',
    'Prepare for standardized tests',
    'Catch up on missed coursework',
    'Get ahead in advanced courses'
  ];

  learning_styles_arr TEXT[] := ARRAY['visual', 'auditory', 'reading/writing', 'kinesthetic', 'mixed'];
  grade_levels TEXT[] := ARRAY['9th Grade', '10th Grade', '11th Grade', '12th Grade', 'College Freshman', 'College Sophomore', 'College Junior', 'College Senior', 'Graduate Student'];

  -- Loop variables
  i INT;
  tutor_id UUID;
  student_id UUID;
  rand_first TEXT;
  rand_last TEXT;
  rand_subjects TEXT[];
  rand_exp INT;
  rand_rate DECIMAL;
  rand_rating DECIMAL;
  phone_num TEXT;
  
BEGIN
  -- ========================================
  -- CREATE 50 TUTORS
  -- ========================================
  RAISE NOTICE 'Creating 50 tutors...';
  
  FOR i IN 1..50 LOOP
    tutor_id := gen_random_uuid();
    rand_first := first_names[1 + floor(random() * array_length(first_names, 1))::int];
    rand_last := last_names[1 + floor(random() * array_length(last_names, 1))::int];
    rand_exp := 1 + floor(random() * 15)::int;
    rand_rate := 15 + floor(random() * 85)::decimal;
    rand_rating := 3.5 + (random() * 1.5)::decimal;
    phone_num := '+1' || (1000000000 + floor(random() * 8999999999)::bigint)::text;
    
    -- Select 2-4 random subjects for this tutor
    rand_subjects := ARRAY(
      SELECT subjects[1 + floor(random() * array_length(subjects, 1))::int]
      FROM generate_series(1, 2 + floor(random() * 3)::int)
    );
    
    -- Insert into profiles
    INSERT INTO public.profiles (id, first_name, last_name, user_type, is_online, created_at)
    VALUES (
      tutor_id,
      rand_first,
      rand_last,
      'tutor',
      random() > 0.7, -- 30% chance of being online
      NOW() - (random() * interval '365 days')
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert into tutors
    INSERT INTO public.tutors (
      profile_id, 
      experience_years, 
      hourly_rate, 
      qualifications, 
      teaching_style, 
      bio_text, 
      availability,
      average_rating,
      phone_number
    )
    VALUES (
      tutor_id,
      rand_exp,
      rand_rate,
      to_jsonb(rand_subjects),
      teaching_styles[1 + floor(random() * array_length(teaching_styles, 1))::int],
      format(
        bio_templates[1 + floor(random() * array_length(bio_templates, 1))::int],
        rand_exp::text,
        rand_subjects[1]
      ),
      '{"monday": ["9:00-12:00", "14:00-18:00"], "tuesday": ["9:00-17:00"], "wednesday": ["10:00-16:00"], "thursday": ["9:00-17:00"], "friday": ["9:00-15:00"]}'::jsonb,
      round(rand_rating::numeric, 1),
      phone_num
    )
    ON CONFLICT (profile_id) DO NOTHING;
    
  END LOOP;
  
  RAISE NOTICE '50 tutors created successfully!';
  
  -- ========================================
  -- CREATE 100 STUDENTS
  -- ========================================
  RAISE NOTICE 'Creating 100 students...';
  
  FOR i IN 1..100 LOOP
    student_id := gen_random_uuid();
    rand_first := first_names[1 + floor(random() * array_length(first_names, 1))::int];
    rand_last := last_names[1 + floor(random() * array_length(last_names, 1))::int];
    phone_num := '+1' || (1000000000 + floor(random() * 8999999999)::bigint)::text;
    
    -- Select 1-3 random preferred subjects
    rand_subjects := ARRAY(
      SELECT subjects[1 + floor(random() * array_length(subjects, 1))::int]
      FROM generate_series(1, 1 + floor(random() * 3)::int)
    );
    
    -- Insert into profiles
    INSERT INTO public.profiles (id, first_name, last_name, user_type, is_online, created_at)
    VALUES (
      student_id,
      rand_first,
      rand_last,
      'student',
      random() > 0.6, -- 40% chance of being online
      NOW() - (random() * interval '365 days')
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert into students
    INSERT INTO public.students (
      profile_id,
      grade_level,
      preferred_subjects,
      learning_goals,
      learning_style,
      phone_number
    )
    VALUES (
      student_id,
      grade_levels[1 + floor(random() * array_length(grade_levels, 1))::int],
      to_jsonb(rand_subjects),
      to_jsonb(learning_goals[1 + floor(random() * array_length(learning_goals, 1))::int]),
      learning_styles_arr[1 + floor(random() * array_length(learning_styles_arr, 1))::int],
      phone_num
    )
    ON CONFLICT (profile_id) DO NOTHING;
    
  END LOOP;
  
  RAISE NOTICE '100 students created successfully!';
  RAISE NOTICE 'Database seeding complete!';
  
END $$;

-- NOTE: The foreign key constraint was dropped. Seeded users don't exist in auth.users.
-- They are for display/testing purposes only. Real users created through signup work normally.

-- ============================================================================
-- VERIFY THE SEED DATA
-- ============================================================================

-- Count tutors
SELECT 'Tutors' as type, COUNT(*) as count FROM public.tutors;

-- Count students  
SELECT 'Students' as type, COUNT(*) as count FROM public.students;

-- Count profiles
SELECT 'Total Profiles' as type, COUNT(*) as count FROM public.profiles;

-- Sample tutors
SELECT 
  p.first_name,
  p.last_name,
  t.experience_years,
  t.hourly_rate,
  t.average_rating,
  t.qualifications
FROM public.tutors t
JOIN public.profiles p ON t.profile_id = p.id
LIMIT 5;

-- Sample students
SELECT 
  p.first_name,
  p.last_name,
  s.grade_level,
  s.preferred_subjects,
  s.learning_style
FROM public.students s
JOIN public.profiles p ON s.profile_id = p.id
LIMIT 5;
