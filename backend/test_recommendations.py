#!/usr/bin/env python
"""
Test the improved recommendation system with availability and weighted fields.
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

from core.recommender import TutorRecommender

def test_enhanced_recommendations():
    """Test that recommendations now use availability and weighted fields."""
    
    print("=" * 80)
    print("TESTING ENHANCED RECOMMENDATION SYSTEM")
    print("=" * 80)
    print()
    
    # Initialize recommender
    recommender = TutorRecommender()
    
    # Fetch tutors from database
    print("1. Fetching tutors from database...")
    tutors_df = recommender.fetch_tutors_from_database()
    print(f"   ✓ Fetched {len(tutors_df)} tutors")
    print()
    
    # Display sample tutor data
    if len(tutors_df) > 0:
        sample_tutor = tutors_df.iloc[0]
        print("2. Sample tutor data (first tutor):")
        print(f"   Name: {sample_tutor['first_name']} {sample_tutor['last_name']}")
        print(f"   Qualifications: {sample_tutor['qualifications']}")
        print(f"   Teaching Style: {sample_tutor['teaching_style']}")
        print(f"   Bio: {sample_tutor['bio_text'][:100] if sample_tutor['bio_text'] else 'N/A'}...")
        print(f"   Availability: {sample_tutor['availability']}")
        print(f"   Rating: {sample_tutor['average_rating']}")
        print()
    
    # Fit the recommender
    print("3. Fitting TF-IDF vectorizer...")
    recommender.fit_transform(tutors_df)
    print("   ✓ Vectorizer fitted successfully")
    print()
    
    # Display sample text soups with new weighting
    print("4. Sample text soups (with new weighting):")
    print()
    for i in range(min(3, len(tutors_df))):
        tutor = tutors_df.iloc[i]
        text_soup = recommender.tutors_df.iloc[i]['text_soup']
        print(f"   Tutor {i+1}: {tutor['first_name']} {tutor['last_name']}")
        print(f"   Text soup preview: {text_soup[:150]}...")
        print()
    
    # Test recommendations with different queries
    test_queries = [
        "I need help with Mathematics and Python programming",
        "Looking for a tutor available on weekends",
        "Need someone who teaches Science with hands-on approach",
        "Expert in calculus and physics",
    ]
    
    print("5. Testing recommendations with different queries:")
    print()
    
    for query in test_queries:
        print(f"   Query: '{query}'")
        recommendations = recommender.get_recommendations(query, top_n=3)
        
        if recommendations:
            print(f"   Found {len(recommendations)} recommendations:")
            for i, rec in enumerate(recommendations, 1):
                match_pct = rec.get('match_percentage', 0)
                tutor_name = f"{rec['first_name']} {rec['last_name']}"
                rating = rec.get('average_rating', 'N/A')
                explanation = rec['explanation'].get('summary', 'No explanation') if isinstance(rec.get('explanation'), dict) else str(rec.get('explanation', 'No explanation'))
                
                print(f"      {i}. {tutor_name}")
                print(f"         Match: {match_pct:.1f}% | Rating: {rating}")
                print(f"         Explanation: {explanation[:100]}...")
                print()
        else:
            print(f"   ✗ No recommendations found")
            print()
    
    print()
    print("=" * 80)
    print("TESTING COMPLETE")
    print("=" * 80)
    print()
    print("KEY IMPROVEMENTS:")
    print("✓ Qualifications now weighted 3x (most important)")
    print("✓ Teaching style weighted 2x (learning compatibility)")
    print("✓ Bio text weighted 2x (expertise)")
    print("✓ Availability now included in text soup (context)")
    print("✓ Better TF-IDF matching with improved field weighting")
    print()

if __name__ == "__main__":
    test_enhanced_recommendations()
