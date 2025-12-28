-- ============================================================================
-- SEED DATABASE: 1000 Additional Tutors + 2000 Additional Students
-- Run this in Supabase SQL Editor
-- ============================================================================

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
    'Alexander', 'Carolyn', 'Patrick', 'Janet', 'Jack', 'Catherine', 'Dennis', 'Maria', 'Jerry', 'Heather',
    'Tyler', 'Diane', 'Aaron', 'Ruth', 'Jose', 'Julie', 'Adam', 'Olivia', 'Nathan', 'Joyce',
    'Henry', 'Virginia', 'Douglas', 'Victoria', 'Zachary', 'Kelly', 'Peter', 'Lauren', 'Kyle', 'Christina',
    'Noah', 'Joan', 'Ethan', 'Evelyn', 'Jeremy', 'Judith', 'Walter', 'Megan', 'Christian', 'Andrea',
    'Keith', 'Cheryl', 'Roger', 'Hannah', 'Terry', 'Jacqueline', 'Austin', 'Martha', 'Sean', 'Gloria',
    'Gerald', 'Teresa', 'Carl', 'Ann', 'Dylan', 'Sara', 'Harold', 'Madison', 'Jordan', 'Frances',
    'Jesse', 'Kathryn', 'Bryan', 'Janice', 'Lawrence', 'Jean', 'Arthur', 'Abigail', 'Gabriel', 'Alice',
    'Bruce', 'Judy', 'Logan', 'Sophia', 'Albert', 'Grace', 'Willie', 'Denise', 'Alan', 'Amber',
    'Eugene', 'Doris', 'Vincent', 'Marilyn', 'Russell', 'Danielle', 'Elijah', 'Beverly', 'Randy', 'Isabella',
    'Philip', 'Theresa', 'Harry', 'Diana', 'Howard', 'Natalie', 'Wayne', 'Brittany', 'Roy', 'Charlotte',
    'Ralph', 'Marie', 'Joe', 'Kayla', 'Billy', 'Alexis', 'Johnny', 'Lori', 'Bobby', 'Julia'];
  
  last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
    'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
    'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
    'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
    'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
    'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'];

  subjects TEXT[] := ARRAY['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science', 
    'Economics', 'Business Studies', 'Accounting', 'Statistics', 'Calculus', 'Algebra', 'Literature', 'Writing',
    'Spanish', 'French', 'German', 'Psychology', 'Sociology', 'Philosophy', 'Art', 'Music',
    'Data Science', 'Machine Learning', 'Web Development', 'Python Programming', 'Java Programming', 'JavaScript',
    'SAT Prep', 'ACT Prep', 'GRE Prep', 'GMAT Prep', 'IELTS Prep', 'TOEFL Prep',
    'Organic Chemistry', 'Biochemistry', 'Environmental Science', 'Astronomy', 'Geology',
    'Trigonometry', 'Linear Algebra', 'Differential Equations', 'Number Theory', 'Discrete Mathematics',
    'Creative Writing', 'Essay Writing', 'Public Speaking', 'Debate', 'Journalism'];

  teaching_styles TEXT[] := ARRAY[
    'I believe in a hands-on, interactive approach where students learn by doing.',
    'My teaching style focuses on building strong fundamentals before advancing.',
    'I adapt my methods to each student''s unique learning style and pace.',
    'I use real-world examples to make complex concepts easy to understand.',
    'My approach combines visual aids, practice problems, and conceptual discussions.',
    'I focus on developing critical thinking skills alongside subject knowledge.',
    'I create a supportive environment where students feel comfortable asking questions.',
    'My method emphasizes understanding over memorization for lasting knowledge.',
    'I use gamification and interactive exercises to make learning fun and engaging.',
    'I believe in the Socratic method - guiding students to discover answers themselves.',
    'My teaching incorporates multimedia resources for diverse learning experiences.',
    'I focus on practical application to show how concepts apply in the real world.'
  ];

  bio_templates TEXT[] := ARRAY[
    'Passionate educator with %s years of experience helping students achieve their academic goals. Specialized in %s.',
    'Dedicated tutor focused on making %s accessible and engaging. %s years of proven success.',
    'Experienced %s tutor committed to student success. Teaching for %s years with excellent results.',
    'Professional educator specializing in %s with %s years of experience. Patient and thorough approach.',
    'Skilled tutor in %s with %s years of teaching experience. Helping students build confidence and skills.',
    'Expert %s instructor with %s years in education. Proven track record of improving student performance.',
    'Certified %s teacher with %s years experience. Passionate about helping students reach their potential.',
    'Accomplished %s educator, %s years of experience. Known for clear explanations and patient guidance.'
  ];

  learning_goals TEXT[] := ARRAY[
    'Improve grades and academic performance',
    'Prepare for university entrance exams',
    'Build strong foundation in core subjects',
    'Develop better study habits and techniques',
    'Gain confidence in challenging subjects',
    'Prepare for standardized tests',
    'Catch up on missed coursework',
    'Get ahead in advanced courses',
    'Prepare for career advancement',
    'Master specific topics for competitions',
    'Improve problem-solving skills',
    'Enhance critical thinking abilities'
  ];

  learning_styles_arr TEXT[] := ARRAY['visual', 'auditory', 'reading/writing', 'kinesthetic', 'mixed'];
  grade_levels TEXT[] := ARRAY['9th Grade', '10th Grade', '11th Grade', '12th Grade', 'College Freshman', 'College Sophomore', 'College Junior', 'College Senior', 'Graduate Student', 'Professional'];

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
  batch_size INT := 100;
  
BEGIN
  -- ========================================
  -- CREATE 1000 TUTORS
  -- ========================================
  RAISE NOTICE 'Creating 1000 tutors...';
  
  FOR i IN 1..1000 LOOP
    tutor_id := gen_random_uuid();
    rand_first := first_names[1 + floor(random() * array_length(first_names, 1))::int];
    rand_last := last_names[1 + floor(random() * array_length(last_names, 1))::int];
    rand_exp := 1 + floor(random() * 20)::int;
    rand_rate := 15 + floor(random() * 135)::decimal; -- $15 to $150/hr
    rand_rating := 3.0 + (random() * 2.0)::decimal; -- 3.0 to 5.0 rating
    phone_num := '+1' || (1000000000 + floor(random() * 8999999999)::bigint)::text;
    
    -- Select 2-5 random subjects for this tutor
    rand_subjects := ARRAY(
      SELECT subjects[1 + floor(random() * array_length(subjects, 1))::int]
      FROM generate_series(1, 2 + floor(random() * 4)::int)
    );
    
    -- Insert into profiles
    INSERT INTO public.profiles (id, first_name, last_name, user_type, is_online, created_at)
    VALUES (
      tutor_id,
      rand_first,
      rand_last,
      'tutor',
      random() > 0.7,
      NOW() - (random() * interval '730 days')
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
    
    -- Progress indicator every 100 tutors
    IF i % 100 = 0 THEN
      RAISE NOTICE 'Created % tutors...', i;
    END IF;
    
  END LOOP;
  
  RAISE NOTICE '1000 tutors created successfully!';
  
  -- ========================================
  -- CREATE 2000 STUDENTS
  -- ========================================
  RAISE NOTICE 'Creating 2000 students...';
  
  FOR i IN 1..2000 LOOP
    student_id := gen_random_uuid();
    rand_first := first_names[1 + floor(random() * array_length(first_names, 1))::int];
    rand_last := last_names[1 + floor(random() * array_length(last_names, 1))::int];
    phone_num := '+1' || (1000000000 + floor(random() * 8999999999)::bigint)::text;
    
    -- Select 1-4 random preferred subjects
    rand_subjects := ARRAY(
      SELECT subjects[1 + floor(random() * array_length(subjects, 1))::int]
      FROM generate_series(1, 1 + floor(random() * 4)::int)
    );
    
    -- Insert into profiles
    INSERT INTO public.profiles (id, first_name, last_name, user_type, is_online, created_at)
    VALUES (
      student_id,
      rand_first,
      rand_last,
      'student',
      random() > 0.6,
      NOW() - (random() * interval '730 days')
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
    
    -- Progress indicator every 200 students
    IF i % 200 = 0 THEN
      RAISE NOTICE 'Created % students...', i;
    END IF;
    
  END LOOP;
  
  RAISE NOTICE '2000 students created successfully!';
  RAISE NOTICE 'Database seeding complete! Added 1000 tutors and 2000 students.';
  
END $$;

-- ============================================================================
-- VERIFY THE SEED DATA
-- ============================================================================

-- Count totals
SELECT 'Tutors' as type, COUNT(*) as count FROM public.tutors
UNION ALL
SELECT 'Students' as type, COUNT(*) as count FROM public.students
UNION ALL
SELECT 'Total Profiles' as type, COUNT(*) as count FROM public.profiles;

-- Tutor statistics
SELECT 
  'Tutor Stats' as info,
  MIN(hourly_rate) as min_rate,
  MAX(hourly_rate) as max_rate,
  ROUND(AVG(hourly_rate)::numeric, 2) as avg_rate,
  ROUND(AVG(average_rating)::numeric, 2) as avg_rating,
  MIN(experience_years) as min_exp,
  MAX(experience_years) as max_exp
FROM public.tutors;

-- Student grade distribution
SELECT 
  grade_level,
  COUNT(*) as count
FROM public.students
GROUP BY grade_level
ORDER BY count DESC;
