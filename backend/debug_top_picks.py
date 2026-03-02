"""
Debug script to diagnose why Top Picks are not being displayed
"""
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

from django.db.models import Avg
from core.models import Student, Tutor, Profile
from django.core.cache import cache

print("=" * 80)
print("TOP PICKS DEBUG SCRIPT")
print("=" * 80)

# =============================================================================
# 1. CHECK DATABASE CONNECTIVITY
# =============================================================================
print("\n[1] DATABASE CONNECTIVITY")
print("-" * 80)
try:
    tutor_count = Tutor.objects.count()
    student_count = Student.objects.count()
    profile_count = Profile.objects.count()
    print(f"✓ Database connected")
    print(f"  - Tutors: {tutor_count}")
    print(f"  - Students: {student_count}")
    print(f"  - Profiles: {profile_count}")
except Exception as e:
    print(f"✗ Database error: {e}")
    sys.exit(1)

# =============================================================================
# 2. CHECK TOP-RATED TUTORS (Fallback logic)
# =============================================================================
print("\n[2] TOP-RATED TUTORS (≥4.0 rating)")
print("-" * 80)
try:
    top_tutors = Tutor.objects.select_related(
        'profile'
    ).prefetch_related(
        'subjects'
    ).annotate(
        avg_rating=Avg('ratings__rating')
    ).filter(
        avg_rating__gte=4.0
    ).order_by('-avg_rating')[:10]
    
    if top_tutors.exists():
        print(f"✓ Found {top_tutors.count()} tutors with ≥4.0 rating:")
        for tutor in top_tutors:
            profile = tutor.profile
            subjects = [s.name for s in tutor.subjects.all()]
            print(f"  - {profile.first_name} {profile.last_name}: {tutor.avg_rating:.2f} ⭐ | Subjects: {subjects}")
    else:
        print("✗ NO tutors found with ≥4.0 rating!")
        print("\n  Checking ALL tutors with ratings:")
        all_tutors = Tutor.objects.select_related('profile').annotate(
            avg_rating=Avg('ratings__rating')
        ).order_by('-avg_rating')[:10]
        
        if all_tutors.exists():
            for tutor in all_tutors:
                profile = tutor.profile
                print(f"    - {profile.first_name} {profile.last_name}: {tutor.avg_rating} ⭐")
        else:
            print("  ✗ NO tutors with ratings found at all!")
            
except Exception as e:
    print(f"✗ Error checking tutors: {e}")

# =============================================================================
# 3. CHECK FIRST STUDENT'S LEARNING GOALS
# =============================================================================
print("\n[3] STUDENT LEARNING GOALS")
print("-" * 80)
try:
    first_student = Student.objects.select_related('profile').first()
    if first_student:
        print(f"✓ Found student: {first_student.profile.first_name} {first_student.profile.last_name}")
        print(f"  - ID: {first_student.profile_id}")
        print(f"  - Learning goals: {first_student.learning_goals}")
        
        if first_student.learning_goals:
            print(f"  ✓ Learning goals are SET")
        else:
            print(f"  ✗ Learning goals are EMPTY or NULL")
    else:
        print("✗ No students found in database!")
except Exception as e:
    print(f"✗ Error checking students: {e}")

# =============================================================================
# 4. TEST ML RECOMMENDER
# =============================================================================
print("\n[4] ML RECOMMENDER TEST")
print("-" * 80)
try:
    from api.ml.recommender import get_recommendations
    
    test_query = "Math Calculus Algebra"
    results = get_recommendations(query=test_query, top_n=5)
    
    if results:
        print(f"✓ ML recommender returned {len(results)} results for '{test_query}':")
        for res in results:
            print(f"  - {res.get('full_name')}: {res.get('similarity_score')} similarity")
    else:
        print(f"✗ ML recommender returned 0 results for '{test_query}'")
        
except Exception as e:
    print(f"✗ Error testing recommender: {e}")
    import traceback
    traceback.print_exc()

# =============================================================================
# 5. TEST API ENDPOINT DIRECTLY
# =============================================================================
print("\n[5] API ENDPOINT TEST")
print("-" * 80)
try:
    from django.test import Client
    from django.test.utils import setup_test_environment
    
    client = Client()
    
    # Test without student_id
    response = client.get('/api/recommendations/')
    print(f"✓ GET /api/recommendations/")
    print(f"  - Status: {response.status_code}")
    print(f"  - Response: {response.json()}")
    
    # Test with student_id if we have one
    if first_student:
        response_with_id = client.get(f'/api/recommendations/?student_id={first_student.profile_id}')
        print(f"\n✓ GET /api/recommendations/?student_id={first_student.profile_id}")
        print(f"  - Status: {response_with_id.status_code}")
        data = response_with_id.json()
        print(f"  - Data count: {len(data.get('data', []))}")
        if data.get('data'):
            print(f"  - First result: {data['data'][0].get('full_name')}")
        
except Exception as e:
    print(f"✗ Error testing API: {e}")
    import traceback
    traceback.print_exc()

# =============================================================================
# 6. CHECK CACHE
# =============================================================================
print("\n[6] CACHE CHECK")
print("-" * 80)
try:
    cache_keys = [
        'smart_recs_anon',
    ]
    
    if first_student:
        cache_keys.append(f"smart_recs_{first_student.profile_id}")
    
    for key in cache_keys:
        cached = cache.get(key)
        if cached:
            print(f"✓ Cache hit for '{key}': {len(cached.get('data', []))} items")
        else:
            print(f"✗ Cache miss for '{key}'")
            
except Exception as e:
    print(f"✗ Error checking cache: {e}")

print("\n" + "=" * 80)
print("DEBUG COMPLETE")
print("=" * 80)
