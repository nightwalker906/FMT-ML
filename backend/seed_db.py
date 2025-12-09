#!/usr/bin/env python
"""
Seed the Find My Tutor database with test data
Handles auth.users foreign key constraint
Run: python seed_db.py
"""
import os
import django
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

from django.db import connection
from core.models import Profile, Student, Tutor, Subject, Session, Rating

def create_auth_user(email):
    """Create a user in auth.users table, or get existing one"""
    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    
    with connection.cursor() as cursor:
        # Try to get existing user first
        cursor.execute("SELECT id FROM auth.users WHERE email = %s;", [email])
        result = cursor.fetchone()
        
        if result:
            return result[0]
        
        # Create new user if doesn't exist
        cursor.execute("""
            INSERT INTO auth.users (
                id, email, encrypted_password, email_confirmed_at, 
                created_at, updated_at, role, aud
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, [
            user_id, email, 'hashed_password', now,
            now, now, 'authenticated', 'authenticated'
        ])
        result = cursor.fetchone()
        return result[0] if result else user_id

def seed_data():
    """Create test data"""
    print("Seeding database with test data...")
    
    now = datetime.now(timezone.utc)
    
    # Create Subjects first
    subjects_data = [
        {'name': 'Mathematics', 'category': 'STEM', 'description': 'Math tutor for all levels'},
        {'name': 'Physics', 'category': 'STEM', 'description': 'Physics education and problem solving'},
        {'name': 'Chemistry', 'category': 'STEM', 'description': 'Chemistry for high school and college'},
        {'name': 'Biology', 'category': 'STEM', 'description': 'Life sciences education'},
        {'name': 'English', 'category': 'Languages', 'description': 'English language and literature'},
        {'name': 'History', 'category': 'Humanities', 'description': 'World and national history'},
        {'name': 'Geography', 'category': 'Humanities', 'description': 'Geography and social studies'},
        {'name': 'Computer Science', 'category': 'STEM', 'description': 'Programming and CS fundamentals'},
    ]
    
    subjects = {}
    for subject_data in subjects_data:
        try:
            subject, created = Subject.objects.get_or_create(
                name=subject_data['name'],
                defaults={
                    'id': uuid.uuid4(),
                    'category': subject_data['category'],
                    'description': subject_data.get('description', ''),
                }
            )
            subjects[subject_data['name']] = subject
            if created:
                print(f"✓ Created subject: {subject.name}")
        except Exception as e:
            print(f"✗ Error creating subject {subject_data['name']}: {e}")
    
    # Create Tutor Profiles
    tutors_data = [
        {
            'first_name': 'John',
            'last_name': 'Smith',
            'email': 'john.smith@example.com',
            'hourly_rate': Decimal('50.00'),
            'experience_years': 10,
            'teaching_style': 'interactive',
            'bio_text': 'Experienced Math tutor with 10 years of experience',
            'qualifications': ['B.Sc Mathematics', 'Teaching Certificate'],
        },
        {
            'first_name': 'Sarah',
            'last_name': 'Johnson',
            'email': 'sarah.johnson@example.com',
            'hourly_rate': Decimal('45.00'),
            'experience_years': 8,
            'teaching_style': 'discussion',
            'bio_text': 'English language expert with focus on literature',
            'qualifications': ['M.A. English Literature', 'TESOL Certified'],
        },
        {
            'first_name': 'Michael',
            'last_name': 'Chen',
            'email': 'michael.chen@example.com',
            'hourly_rate': Decimal('60.00'),
            'experience_years': 12,
            'teaching_style': 'hands_on',
            'bio_text': 'Computer Science specialist, industry experience',
            'qualifications': ['B.Tech Computer Science', 'AWS Certified'],
        },
        {
            'first_name': 'Emily',
            'last_name': 'Williams',
            'email': 'emily.williams@example.com',
            'hourly_rate': Decimal('55.00'),
            'experience_years': 7,
            'teaching_style': 'lecture',
            'bio_text': 'Chemistry and Biology tutor for high school students',
            'qualifications': ['B.Sc Chemistry', 'B.Sc Biology'],
        },
    ]
    
    tutors = {}
    print()
    for tutor_data in tutors_data:
        try:
            # Create auth user first
            auth_user_id = create_auth_user(tutor_data['email'])
            
            # Create or update profile with the same ID as auth user
            profile, created = Profile.objects.update_or_create(
                id=auth_user_id,
                defaults={
                    'first_name': tutor_data['first_name'],
                    'last_name': tutor_data['last_name'],
                    'email': tutor_data['email'],
                    'user_type': 'tutor',
                    'is_online': True,
                    'created_at': now,
                    'updated_at': now,
                }
            )
            
            # Create tutor profile
            tutor, created = Tutor.objects.update_or_create(
                profile_id=profile.id,
                defaults={
                    'hourly_rate': tutor_data['hourly_rate'],
                    'experience_years': tutor_data['experience_years'],
                    'teaching_style': tutor_data['teaching_style'],
                    'bio_text': tutor_data['bio_text'],
                    'qualifications': tutor_data['qualifications'],
                    'availability': {
                        'monday': ['09:00-12:00', '14:00-18:00'],
                        'tuesday': ['09:00-12:00', '14:00-18:00'],
                        'wednesday': ['09:00-12:00', '14:00-18:00'],
                        'thursday': ['09:00-12:00', '14:00-18:00'],
                        'friday': ['09:00-12:00', '14:00-18:00'],
                        'saturday': ['10:00-14:00'],
                    },
                    'average_rating': None,
                }
            )
            
            tutors[profile.email] = tutor
            if created:
                print(f"✓ Created tutor: {profile.first_name} {profile.last_name}")
            else:
                print(f"✓ Updated tutor: {profile.first_name} {profile.last_name}")
        except Exception as e:
            print(f"✗ Error creating tutor {tutor_data['email']}: {e}")
    
    # Create Student Profiles
    students_data = [
        {
            'first_name': 'Alex',
            'last_name': 'Rodriguez',
            'email': 'alex.rodriguez@example.com',
            'grade_level': '12',
            'learning_style': 'visual',
            'preferred_subjects': ['Mathematics', 'Physics'],
            'learning_goals': ['Ace Math exam', 'Understand Physics concepts'],
        },
        {
            'first_name': 'Jessica',
            'last_name': 'Brown',
            'email': 'jessica.brown@example.com',
            'grade_level': '10',
            'learning_style': 'auditory',
            'preferred_subjects': ['English', 'History'],
            'learning_goals': ['Improve writing skills', 'Understand history better'],
        },
        {
            'first_name': 'David',
            'last_name': 'Miller',
            'email': 'david.miller@example.com',
            'grade_level': '11',
            'learning_style': 'kinesthetic',
            'preferred_subjects': ['Computer Science', 'Mathematics'],
            'learning_goals': ['Learn programming', 'Master algorithms'],
        },
        {
            'first_name': 'Lisa',
            'last_name': 'Anderson',
            'email': 'lisa.anderson@example.com',
            'grade_level': '9',
            'learning_style': 'reading_writing',
            'preferred_subjects': ['Chemistry', 'Biology'],
            'learning_goals': ['Pass science exam', 'Understand lab work'],
        },
    ]
    
    students = {}
    print()
    for student_data in students_data:
        try:
            # Create auth user first
            auth_user_id = create_auth_user(student_data['email'])
            
            # Create or update profile with the same ID as auth user
            profile, created = Profile.objects.update_or_create(
                id=auth_user_id,
                defaults={
                    'first_name': student_data['first_name'],
                    'last_name': student_data['last_name'],
                    'email': student_data['email'],
                    'user_type': 'student',
                    'is_online': False,
                    'created_at': now,
                    'updated_at': now,
                }
            )
            
            # Create student profile
            student, created = Student.objects.update_or_create(
                profile_id=profile.id,
                defaults={
                    'grade_level': student_data['grade_level'],
                    'learning_style': student_data['learning_style'],
                    'preferred_subjects': student_data['preferred_subjects'],
                    'learning_goals': student_data['learning_goals'],
                }
            )
            
            students[profile.email] = student
            if created:
                print(f"✓ Created student: {profile.first_name} {profile.last_name}")
            else:
                print(f"✓ Updated student: {profile.first_name} {profile.last_name}")
        except Exception as e:
            print(f"✗ Error creating student {student_data['email']}: {e}")
    
    # Create Sessions
    sessions_data = [
        {
            'student_email': 'alex.rodriguez@example.com',
            'tutor_email': 'john.smith@example.com',
            'subject_name': 'Mathematics',
            'status': 'completed',
            'scheduled_time': now - timedelta(days=2),
            'duration_minutes': 60,
        },
        {
            'student_email': 'jessica.brown@example.com',
            'tutor_email': 'sarah.johnson@example.com',
            'subject_name': 'English',
            'status': 'completed',
            'scheduled_time': now - timedelta(days=1),
            'duration_minutes': 45,
        },
        {
            'student_email': 'david.miller@example.com',
            'tutor_email': 'michael.chen@example.com',
            'subject_name': 'Computer Science',
            'status': 'scheduled',
            'scheduled_time': now + timedelta(days=1),
            'duration_minutes': 90,
        },
        {
            'student_email': 'lisa.anderson@example.com',
            'tutor_email': 'emily.williams@example.com',
            'subject_name': 'Chemistry',
            'status': 'scheduled',
            'scheduled_time': now + timedelta(days=2),
            'duration_minutes': 60,
        },
    ]
    
    sessions = {}
    for session_data in sessions_data:
        try:
            student = students.get(session_data['student_email'])
            tutor = tutors.get(session_data['tutor_email'])
            subject = subjects.get(session_data['subject_name'])
            
            if student and tutor and subject:
                session, created = Session.objects.get_or_create(
                    student=student,
                    tutor=tutor,
                    subject=subject,
                    defaults={
                        'id': uuid.uuid4(),
                        'status': session_data['status'],
                        'meeting_url': 'https://meet.google.com/abc-defg-hij',
                        'scheduled_time': session_data['scheduled_time'],
                        'duration_minutes': session_data['duration_minutes'],
                        'created_at': now,
                    }
                )
                # Store session using student + tutor as key for later use in ratings
                sessions[f"{session_data['student_email']}:{session_data['tutor_email']}"] = session
                if created:
                    print(f"✓ Created session: {student.profile.first_name} with {tutor.profile.first_name}")
        except Exception as e:
            print(f"✗ Error creating session: {e}")
    
    print()
    
    # Create Ratings
    rating_data = [
        {
            'student_email': 'alex.rodriguez@example.com',
            'tutor_email': 'john.smith@example.com',
            'knowledge_rating': 5,
            'teaching_style_rating': 4,
            'communication_rating': 5,
            'overall_rating': Decimal('4.7'),
            'review_text': 'Excellent tutor! Very clear explanations.',
        },
        {
            'student_email': 'jessica.brown@example.com',
            'tutor_email': 'sarah.johnson@example.com',
            'knowledge_rating': 4,
            'teaching_style_rating': 4,
            'communication_rating': 5,
            'overall_rating': Decimal('4.3'),
            'review_text': 'Good teaching style, very helpful.',
        },
        {
            'student_email': 'lisa.anderson@example.com',
            'tutor_email': 'emily.williams@example.com',
            'knowledge_rating': 5,
            'teaching_style_rating': 5,
            'communication_rating': 5,
            'overall_rating': Decimal('5.0'),
            'review_text': 'Perfect! Really helped me understand the concepts.',
        },
    ]
    
    for rating_info in rating_data:
        try:
            student = students.get(rating_info['student_email'])
            tutor = tutors.get(rating_info['tutor_email'])
            session = sessions.get(f"{rating_info['student_email']}:{rating_info['tutor_email']}")
            
            if student and tutor and session:
                rating, created = Rating.objects.get_or_create(
                    student=student,
                    tutor=tutor,
                    defaults={
                        'id': uuid.uuid4(),
                        'session': session,
                        'knowledge_rating': rating_info['knowledge_rating'],
                        'teaching_style_rating': rating_info['teaching_style_rating'],
                        'communication_rating': rating_info['communication_rating'],
                        'overall_rating': rating_info['overall_rating'],
                        'review_text': rating_info['review_text'],
                        'created_at': now,
                    }
                )
                if created:
                    print(f"✓ Created rating: {rating_info['overall_rating']} stars from {student.profile.first_name}")
        except Exception as e:
            print(f"✗ Error creating rating: {e}")
    
    print("\n✅ Database seeding complete!")

if __name__ == '__main__':
    seed_data()
