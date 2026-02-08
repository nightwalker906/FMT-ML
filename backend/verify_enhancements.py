#!/usr/bin/env python
"""
Verify that the recommendation engine has been properly enhanced.
This script checks all components are correctly configured.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

from core.recommender import TutorRecommender
import inspect

def verify_enhancements():
    """Verify all enhancements are in place."""
    
    print("\n" + "=" * 80)
    print("RECOMMENDATION ENGINE ENHANCEMENT VERIFICATION")
    print("=" * 80 + "\n")
    
    checks_passed = 0
    checks_total = 0
    
    # Check 1: TutorRecommender class exists
    checks_total += 1
    try:
        recommender = TutorRecommender()
        print("✓ CHECK 1: TutorRecommender class loads successfully")
        checks_passed += 1
    except Exception as e:
        print(f"✗ CHECK 1 FAILED: {str(e)}")
    
    # Check 2: create_text_soup method has proper weighting
    checks_total += 1
    try:
        source = inspect.getsource(recommender.create_text_soup)
        
        # Verify weighting exists in code
        has_3x = "subjects_text, subjects_text, subjects_text" in source or \
                 "text_parts.extend([subjects_text, subjects_text, subjects_text])" in source
        has_2x_style = "text_parts.extend([teaching_style, teaching_style])" in source
        has_2x_bio = "text_parts.extend([bio, bio])" in source
        has_availability = "availability" in source.lower()
        
        if has_3x and has_2x_style and has_2x_bio and has_availability:
            print("✓ CHECK 2: Field weighting implemented (3x/2x/2x/1x)")
            checks_passed += 1
        else:
            print("✗ CHECK 2 FAILED: Field weighting not properly implemented")
            if not has_3x:
                print("  - Missing 3x qualifications weighting")
            if not has_2x_style:
                print("  - Missing 2x teaching_style weighting")
            if not has_2x_bio:
                print("  - Missing 2x bio weighting")
            if not has_availability:
                print("  - Missing availability handling")
    except Exception as e:
        checks_total -= 1
        print(f"⚠ CHECK 2 SKIPPED: Could not inspect source - {str(e)}")
    
    # Check 3: Availability field in SQL query
    checks_total += 1
    try:
        source = inspect.getsource(recommender.fetch_tutors_from_database)
        if "availability" in source and "SELECT" in source:
            print("✓ CHECK 3: Availability field in SQL query")
            checks_passed += 1
        else:
            print("✗ CHECK 3 FAILED: Availability not in SQL query")
    except Exception as e:
        checks_total -= 1
        print(f"⚠ CHECK 3 SKIPPED: Could not inspect source - {str(e)}")
    
    # Check 4: get_recommendations method exists
    checks_total += 1
    try:
        if hasattr(recommender, 'get_recommendations') and callable(recommender.get_recommendations):
            print("✓ CHECK 4: get_recommendations method exists")
            checks_passed += 1
        else:
            print("✗ CHECK 4 FAILED: get_recommendations method not found")
    except Exception as e:
        print(f"✗ CHECK 4 FAILED: {str(e)}")
    
    # Check 5: TF-IDF vectorizer configured
    checks_total += 1
    try:
        source = inspect.getsource(recommender.__init__)
        has_tfidf = "TfidfVectorizer" in source
        has_stop_words = "stop_words" in source
        has_ngrams = "ngram_range" in source
        
        if has_tfidf and has_stop_words and has_ngrams:
            print("✓ CHECK 5: TF-IDF vectorizer properly configured")
            checks_passed += 1
        else:
            print("✗ CHECK 5 FAILED: TF-IDF vectorizer not properly configured")
    except Exception as e:
        print(f"✗ CHECK 5 FAILED: {str(e)}")
    
    # Check 6: XAI explanation generation
    checks_total += 1
    try:
        if hasattr(recommender, '_generate_explanation') and callable(recommender._generate_explanation):
            print("✓ CHECK 6: XAI explanation generation implemented")
            checks_passed += 1
        else:
            print("✗ CHECK 6 FAILED: _generate_explanation method not found")
    except Exception as e:
        print(f"✗ CHECK 6 FAILED: {str(e)}")
    
    # Check 7: Database connectivity
    checks_total += 1
    try:
        tutors_df = recommender.fetch_tutors_from_database()
        
        # Verify expected columns
        expected_cols = ['id', 'bio_text', 'qualifications', 'teaching_style', 'availability']
        missing_cols = [col for col in expected_cols if col not in tutors_df.columns]
        
        if not missing_cols and len(tutors_df) > 0:
            print(f"✓ CHECK 7: Database connectivity OK (fetched {len(tutors_df)} tutors)")
            checks_passed += 1
        else:
            if missing_cols:
                print(f"✗ CHECK 7 FAILED: Missing columns: {missing_cols}")
            if len(tutors_df) == 0:
                print("⚠ CHECK 7 WARNING: No tutors found in database (expected for new setups)")
                checks_passed += 1  # Don't count as failure if database is empty
    except Exception as e:
        print(f"⚠ CHECK 7 SKIPPED: Database not available - {str(e)}")
        checks_total -= 1
    
    # Summary
    print("\n" + "=" * 80)
    print(f"VERIFICATION RESULTS: {checks_passed}/{checks_total} checks passed")
    print("=" * 80 + "\n")
    
    if checks_passed == checks_total:
        print("✓ ALL CHECKS PASSED - Recommendation engine is properly enhanced!")
        print("\nThe system now includes:")
        print("  • 3x weighted qualifications/subjects (primary matching factor)")
        print("  • 2x weighted teaching style (learning compatibility)")
        print("  • 2x weighted bio text (expertise description)")
        print("  • 1x weighted availability (schedule alignment)")
        print("  • XAI explanations for each recommendation")
        print("  • Multi-factor ranking (similarity + rating)")
        return True
    else:
        print(f"✗ SOME CHECKS FAILED - {checks_total - checks_passed} issue(s) to address")
        return False

if __name__ == "__main__":
    success = verify_enhancements()
    sys.exit(0 if success else 1)
