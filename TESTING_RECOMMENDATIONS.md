# Testing the Enhanced Recommendation Engine

## Quick Start

### 1. Verify Enhancements Are Installed
```bash
cd backend
python verify_enhancements.py
```

Expected output:
```
✓ CHECK 1: TutorRecommender class loads successfully
✓ CHECK 2: Field weighting implemented (3x/2x/2x/1x)
✓ CHECK 3: Availability field in SQL query
✓ CHECK 4: get_recommendations method exists
✓ CHECK 5: TF-IDF vectorizer properly configured
✓ CHECK 6: XAI explanation generation implemented
✓ CHECK 7: Database connectivity OK (fetched X tutors)

VERIFICATION RESULTS: 7/7 checks passed
```

### 2. Test Recommendations with Sample Data
```bash
cd backend
python test_recommendations.py
```

This script will:
- Fetch tutors from database
- Display sample tutor data
- Fit the TF-IDF vectorizer
- Show sample text soups with new weighting
- Test multiple recommendation queries
- Display explanations and match percentages

## Manual Testing

### Step 1: Start the Backend
```bash
cd backend
python manage.py runserver
```

### Step 2: Start the Frontend
```bash
cd frontend
npm run dev
```

### Step 3: Test in Browser

#### Route 1: Test as New Student
1. Go to `http://localhost:3000/login`
2. Sign up with:
   - Email: `testStudent@example.com`
   - Password: `Test123!`
   - Role: **Student**
3. You'll be redirected to student dashboard
4. Look for "Smart Recommendations" section at top
5. You'll see a message: *"No recommendations yet. Add your learning goals to get personalized tutor matches!"*

#### Route 2: Test with Learning Goals
1. Go to `http://localhost:3000/student/settings`
2. Scroll to "Learning Goals" section
3. Add goals like:
   ```
   I need help with Calculus and Differential Equations
   I prefer hands-on learning with real-world examples
   Flexible schedule, prefer weekends
   Need someone with 5+ years experience
   ```
4. Click "Save Settings"
5. Go back to `http://localhost:3000/student/dashboard`
6. **Smart Recommendations** should now show tutors matched to your goals!

#### Route 3: Test Different Goal Combinations
Try adding different learning goals to see how recommendations change:

**Scenario A: Math Student**
```
Goals:
- Need help with precalculus and trigonometry
- Prefer structured problem-solving approach
- Available weekday evenings
```

**Scenario B: Programming Beginner**
```
Goals:
- Learning Python for beginners
- Project-based learning preferred
- Flexible schedule, can do anytime
```

**Scenario C: Professional Learner**
```
Goals:
- Advanced Python and data science concepts
- 10+ years tutoring experience required
- Weekend availability important
```

## API Testing

### Test Endpoint Directly

#### With Student ID (Personalized)
```bash
curl "http://localhost:8000/api/recommendations/?student_id=<student-uuid>"
```

Expected response:
```json
{
  "status": "success",
  "data": [
    {
      "id": "tutor-uuid",
      "first_name": "John",
      "last_name": "Smith",
      "similarity_score": 0.87,
      "match_percentage": 87.0,
      "average_rating": 4.8,
      "hourly_rate": 45.00,
      "explanation": {
        "summary": "Excellent match! Teaches Calculus with problem-solving focus",
        "match_strength": "Excellent",
        "matching_keywords": ["calculus", "problem-solving", "hands-on"],
        "factors": [...]
      }
    },
    ...
  ]
}
```

#### Without Student ID (Top Rated Fallback)
```bash
curl "http://localhost:8000/api/recommendations/"
```

Expected response:
```json
{
  "status": "success",
  "data": [
    {
      "id": "tutor-uuid",
      "first_name": "Sarah",
      "last_name": "Johnson",
      "average_rating": 4.9,
      "hourly_rate": 55.00,
      ...
    },
    ...
  ]
}
```

### Test POST Endpoint (Alternative)

```bash
curl -X POST "http://localhost:8000/api/recommend/" \
  -H "Content-Type: application/json" \
  -d '{"query": "I need help with Python programming and machine learning"}'
```

## Understanding the Output

### Match Percentage Explanation

The match percentage is calculated as:
```
match_percentage = similarity_score × 100
```

Where similarity_score is the cosine similarity between:
- Student's learning goals (as a TF-IDF vector)
- Tutor's text soup (qualifications × 3 + teaching_style × 2 + bio × 2 + availability × 1)

### Color Coding (Frontend)

- **Green Badge**: ≥90% match (excellent fit)
- **Blue Badge**: 70-89% match (strong fit)
- **Gray Badge**: <70% match (decent option)

### Explanation Fields

Each recommendation includes:

1. **Summary**: One-line human-readable explanation
   - Example: "Great match! Python expert with flexible weekday availability"

2. **Match Strength**: Category of match quality
   - Values: Excellent (70%+), Strong (50-69%), Good (30-49%), Moderate (15-29%), Partial (<15%)

3. **Matching Keywords**: Top 5 terms that matched
   - Example: ["python", "flexible", "hands-on", "weekend"]

4. **Factors**: Breakdown of recommendation reasons
   ```json
   [
     {
       "factor": "Keyword Relevance",
       "description": "Matched 5 keyword(s) from your search",
       "keywords": ["python", "programming", "flexible", "hands-on"],
       "impact": "high"
     },
     {
       "factor": "Subject Expertise",
       "description": "Teaches 8 subject(s)",
       "subjects": ["Python", "JavaScript", "Web Development", ...],
       "impact": "high"
     },
     {
       "factor": "Student Rating",
       "description": "Rated 4.8 out of 5 by students",
       "value": 4.8,
       "impact": "high"
     },
     ...
   ]
   ```

## Debugging

### Enable Debug Logging

Add to `backend/fmt_project/settings.py`:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
    'loggers': {
        'core.recommender': {
            'level': 'DEBUG',
        },
    },
}
```

### Common Issues

#### Issue: "No recommendations found"
**Cause**: No tutors in database with matching criteria
**Solution**: 
1. Verify tutors exist: `python manage.py shell` → `Tutor.objects.count()`
2. Verify tutors have learning_goals: Check students table has goals

#### Issue: "Recommendations don't change when goals change"
**Cause**: Learning goals not being saved properly
**Solution**:
1. Check student settings page saved goals
2. Verify in DB: `Student.objects.get(id=<id>).learning_goals`
3. Check API response includes goals in /api/recommendations/

#### Issue: "All tutors have same match percentage"
**Cause**: Text soups are too similar or vocabulary too limited
**Solution**:
1. Verify qualifications are diverse across tutors
2. Check teaching_style field is populated
3. Run `python test_recommendations.py` to see sample text soups

#### Issue: "Performance is slow"
**Cause**: Large number of tutors or vocabulary
**Solution**:
1. Check tutor count: `Tutor.objects.count()`
2. Verify max_features=5000 in vectorizer settings
3. Consider caching recommendations

## Expected Performance

| Metric | Expected Value |
|--------|-----------------|
| API Response Time | <500ms |
| Text Soup Creation | <1ms per tutor |
| Vectorization | <100ms (up to 1000 tutors) |
| Similarity Calculation | <50ms |
| Total Request Time | <500-800ms |

## Validation Checklist

After running tests, verify:

- [ ] Verification script shows 7/7 checks passed
- [ ] Test recommendations script runs without errors
- [ ] Frontend loads SmartRecommendations carousel
- [ ] Adding learning goals changes recommendations
- [ ] API endpoint returns proper JSON structure
- [ ] Match percentages vary based on student goals
- [ ] Explanations include matching keywords
- [ ] Tutor detail links work when clicking recommendations
- [ ] Empty state shows when no recommendations available
- [ ] Performance is acceptable (<1 second response time)

## Next Steps

Once testing is complete:

1. **Monitor Real Usage**: Track which recommendations students choose
2. **Collect Feedback**: Survey students on recommendation relevance
3. **Refine Weights**: Adjust 3x/2x/1x weighting based on feedback
4. **Add Location Matching**: When location field is added to schema
5. **Implement Favorites**: Save and learn from student preferences
6. **A/B Testing**: Test different weighting schemes

## Support

For issues or questions:
1. Check logs in console where backend is running
2. Run verify_enhancements.py to identify problems
3. Test with curl commands to isolate API issues
4. Check browser console for frontend errors
