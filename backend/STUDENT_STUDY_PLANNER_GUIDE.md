# Student Study Planner Integration Guide

## Overview

The study planner feature is **already integrated** into the backend API for students to use. Here's how it works:

---

## 📍 Endpoint Location

**Base URL:** `http://localhost:8000/api/`

**Endpoints Available:**
- `POST /generate-plan/` - Generate a study plan
- `POST /study-tips/` - Get quick study tips
- `POST /estimate-time/` - Estimate learning time

---

## 🎯 How Students Can Use It

### 1. Generate a Study Plan

**Endpoint:** `POST /api/generate-plan/`

**Request Body:**
```json
{
  "goal": "Master Python for interviews",
  "weakness": "Data structures and algorithms",
  "weeks": 4,
  "context": "3 months until interviews"
}
```

**Parameters:**
- `goal` (required): What the student wants to achieve
- `weakness` (required): Areas needing improvement
- `weeks` (optional): Duration in weeks (default: 4, max: 12)
- `context` (optional): Additional information about the student

**Response (Success):**
```json
{
  "status": "success",
  "message": "Study plan generated successfully",
  "plan": [
    {
      "week": 1,
      "theme": "Foundation Building",
      "topic": "Python basics and data types",
      "learning_objectives": [
        "Understand Python syntax",
        "Learn list and dictionary operations"
      ],
      "action_items": [
        "Review Python fundamentals",
        "Complete 10 practice problems on lists",
        "Build a simple project using dictionaries"
      ],
      "resources": [
        "Online tutorials",
        "Practice problems"
      ],
      "milestone": "Complete basic assessment with 80%+ accuracy"
    },
    // ... more weeks
  ],
  "metadata": {
    "generated_at": "2026-01-26T...",
    "method": "ollama",  // or "huggingface" or "mock_fallback"
    "duration_weeks": 4,
    "input": {
      "goal": "Master Python for interviews",
      "weak_areas": "Data structures and algorithms"
    }
  }
}
```

**Response (Fallback - AI Service Unavailable):**
```json
{
  "status": "fallback",
  "message": "AI service unavailable. Generated template plan.",
  "plan": [...],  // Template study plan
  "metadata": {
    "method": "mock_fallback",
    "error": "No AI service available"
  }
}
```

---

### 2. Get Quick Study Tips

**Endpoint:** `POST /api/study-tips/`

**Request Body:**
```json
{
  "topic": "Machine Learning",
  "count": 5
}
```

**Parameters:**
- `topic` (required): The topic to get tips for
- `count` (optional): Number of tips (default: 5)

**Response:**
```json
{
  "status": "success",
  "topic": "Machine Learning",
  "service": "ollama",
  "tips": [
    "Start with supervised learning before diving into unsupervised methods",
    "Practice with smaller datasets first to understand algorithms",
    "Visualize your data to catch patterns and anomalies",
    "Use cross-validation to evaluate model performance accurately",
    "Implement algorithms from scratch to understand the math"
  ]
}
```

---

### 3. Estimate Study Time

**Endpoint:** `POST /api/estimate-time/`

**Request Body:**
```json
{
  "topic": "React.js",
  "skill_level": "beginner",
  "goal": "proficiency"
}
```

**Parameters:**
- `topic` (required): What to learn
- `skill_level` (optional): "beginner", "intermediate", "advanced" (default: "beginner")
- `goal` (optional): "familiarity", "proficiency", "mastery" (default: "proficiency")

**Response:**
```json
{
  "topic": "React.js",
  "current_level": "beginner",
  "target_level": "proficiency",
  "estimated_hours": 40,
  "suggested_schedule": {
    "intensive": "4 days (10 hours/day)",
    "moderate": "4 weeks (10 hours/week)",
    "relaxed": "8 weeks (5 hours/week)"
  },
  "recommendation": "For proficiency in React.js, plan for approximately 40 hours of focused study."
}
```

---

## 🔒 Access & Rate Limits

### Authentication
- **Public Access:** ✅ No authentication required
- **Rate Limiting:** ⚠️ 10 requests/day per IP address (protects AI service resources)

### Using in Frontend

**JavaScript/Fetch Example:**
```javascript
async function generateStudyPlan() {
  const response = await fetch('http://localhost:8000/api/generate-plan/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      goal: "Master React.js",
      weakness: "State management and hooks",
      weeks: 4,
      context: "Learning full-stack web development"
    })
  });
  
  const data = await response.json();
  console.log(data.plan);  // Display study plan to student
}
```

**React Hook Example:**
```javascript
import { useState } from 'react';

export function StudyPlannerComponent() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGeneratePlan = async (goal, weakness, weeks) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-plan/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, weakness, weeks })
      });
      const data = await response.json();
      setPlan(data.plan);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Form to get goal, weakness, weeks */}
      {loading && <p>Generating your study plan...</p>}
      {plan && (
        <div>
          {plan.map(week => (
            <div key={week.week}>
              <h3>Week {week.week}: {week.theme}</h3>
              <p>{week.topic}</p>
              <ul>
                {week.action_items.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🛠️ Backend Integration (Already Done)

The study planner is already integrated into:

1. **Views** ([core/views.py](core/views.py)):
   - `generate_plan()` - Main endpoint (line 1019)
   - `get_study_tips()` - Tips endpoint
   - `estimate_study_time_view()` - Time estimation endpoint

2. **URLs** ([core/urls.py](core/urls.py)):
   - Routes configured for all three endpoints

3. **Study Planner Module** ([core/study_planner.py](core/study_planner.py)):
   - `generate_study_plan()` - Main AI function
   - `get_quick_tips()` - Tips generation
   - `estimate_study_time()` - Time estimation

---

## ⚙️ AI Service Configuration

The study planner automatically uses the best available AI service:

### Priority Order:
1. **Ollama** (Local) - If running at `localhost:11434`
2. **Hugging Face** (Cloud) - If `HF_API_KEY` set in `.env`
3. **Mock/Fallback** - If neither available

### Setup Options:

**Option A: Ollama (Recommended for Development)**
```bash
# Install from https://ollama.ai
ollama pull mistral
ollama serve
```

**Option B: Hugging Face (Cloud)**
```bash
# Add to .env:
HF_API_KEY=hf_xxxxx_your_token
```

See [FREE_AI_SETUP.md](FREE_AI_SETUP.md) for detailed setup instructions.

---

## 📊 Study Plan Structure

Each week in the study plan includes:

```python
{
  "week": 1,                              # Week number
  "theme": "Foundation Building",         # Phase name
  "topic": "Core concept focus",          # Main topic
  "learning_objectives": [                # What to learn
    "Objective 1",
    "Objective 2"
  ],
  "action_items": [                       # Specific tasks
    "Task 1",
    "Task 2",
    "Task 3"
  ],
  "resources": [                          # Learning materials
    "Resource type/recommendation"
  ],
  "milestone": "Achievement to aim for"   # Weekly goal
}
```

---

## 🧪 Testing

### Test with cURL:
```bash
curl -X POST http://localhost:8000/api/generate-plan/ \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Learn Django",
    "weakness": "REST API design",
    "weeks": 3
  }'
```

### Test with Python:
```python
import requests

response = requests.post(
  'http://localhost:8000/api/generate-plan/',
  json={
    'goal': 'Master SQL',
    'weakness': 'Complex joins and subqueries',
    'weeks': 4
  }
)

print(response.json())
```

---

## 🎓 Features Ready for Students

✅ **Study Plan Generation** - AI creates customized week-by-week plans  
✅ **Quick Tips** - Fast study advice for any topic  
✅ **Time Estimation** - Realistic learning time predictions  
✅ **Fallback Support** - Works even without AI service (template mode)  
✅ **Rate Limited** - Protects resource usage  
✅ **Public Access** - No login needed for basic usage  

---

## 📝 Notes

- Study plans are **not stored in the database** (stateless API)
- Each request generates a fresh plan
- Plans progressively build from basics to advanced topics
- All weak areas specified are addressed in the plan
- Final week includes revision and assessment prep

---

## 🚀 Next Steps

1. **Frontend Integration** - Add study planner to student dashboard
2. **Persistent Storage** - Save generated plans to user profiles (optional)
3. **History Tracking** - Log which plans students used
4. **Feedback System** - Let students rate plan helpfulness
5. **Progress Tracking** - Track completion of weekly milestones

