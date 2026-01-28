# Testing the Free AI Study Planner

## Quick Test (No Setup Needed)

The study planner will fallback to mock plans if no AI service is available:

```python
python manage.py shell

from core.study_planner import generate_study_plan

result = generate_study_plan(
    student_goal="Learn Django REST Framework",
    weak_areas="Authentication and Permissions",
    duration_weeks=2
)

print(result)
# Shows mock plan if no AI service running
```

---

## Full Test with Ollama (Recommended)

### Step 1: Install & Run Ollama
```bash
# Install from https://ollama.ai

# Pull a model
ollama pull mistral

# Start the service (keep running in background)
ollama serve
```

### Step 2: Test the Connection
```bash
# In another terminal, verify Ollama is running:
curl http://localhost:11434/api/tags
# Should return JSON with available models
```

### Step 3: Test Study Planner
```bash
python manage.py shell

from core.study_planner import generate_study_plan, get_quick_tips

# Test study plan generation
result = generate_study_plan(
    student_goal="Master Python Decorators",
    weak_areas="Higher-order functions and closures",
    duration_weeks=3
)

print(f"Status: {result['status']}")  # Should be 'success'
print(f"Service: {result['metadata']['method']}")  # Should be 'ollama'
print(f"Plan weeks: {len(result['plan'])}")  # Should be 3

# Test quick tips
tips_result = get_quick_tips("Object-Oriented Programming")
print(f"Tips: {tips_result['tips']}")
```

---

## Test with Hugging Face (Cloud)

### Step 1: Get API Key
```bash
# 1. Sign up at https://huggingface.co (free)
# 2. Go to https://huggingface.co/settings/tokens
# 3. Create new token with "Read" permissions
# 4. Copy the token
```

### Step 2: Configure .env
```bash
# In backend/.env:
HF_API_KEY=hf_xxxxx_your_token_here
```

### Step 3: Restart Django and Test
```bash
python manage.py shell

from core.study_planner import generate_study_plan

result = generate_study_plan(
    student_goal="Learn Data Science with Python",
    weak_areas="Pandas and Data Manipulation",
    duration_weeks=4
)

print(f"Status: {result['status']}")  # Should be 'success'
print(f"Service: {result['metadata']['method']}")  # Should be 'huggingface'
```

---

## Debugging

### Check which service is being used:

```python
from core.study_planner import _initialize_ai_client

client = _initialize_ai_client()
if client:
    print(f"Using: {client['service']}")
    print(f"Details: {client}")
else:
    print("No AI service available - will use mock plans")
```

### View logs:
```python
import logging
logging.basicConfig(level=logging.DEBUG)

from core.study_planner import generate_study_plan
result = generate_study_plan(
    student_goal="Test",
    weak_areas="Test Area",
    duration_weeks=1
)
# Check console for debug messages
```

---

## Expected Behavior

### With Ollama Running ✅
```
Status: success
Method: ollama
Actual study plan with AI-generated content
```

### With Hugging Face API Key ✅
```
Status: success
Method: huggingface
Actual study plan with AI-generated content
```

### Neither Available (No Service) ⚠️
```
Status: fallback
Method: mock_fallback
Message: "AI service unavailable. Generated template plan."
Template study plan for demo purposes
```

---

## API Response Structure

All three functions return dictionaries with this structure:

```python
{
    'status': 'success' | 'fallback' | 'error',
    'message': 'Human-readable message',
    'plan': [...],  # List of weekly plans
    'metadata': {
        'generated_at': '2026-01-26T...',
        'method': 'ollama' | 'huggingface' | 'mock_fallback',
        'duration_weeks': 4,
        'input': {'goal': '...', 'weak_areas': '...'}
    }
}
```

---

## Performance Notes

| Service | Speed | Notes |
|---------|-------|-------|
| **Ollama** | ~5-15s per plan | Local, depends on CPU |
| **Hugging Face** | ~15-60s first call, ~5s after | Cloud, first call loads model |
| **Mock** | <1ms | Instant fallback |

---

## Troubleshooting

**Q: "Empty response from AI service"**
- Ollama: Is `ollama serve` running?
- Hugging Face: Check API key in .env

**Q: "Model timeout"**
- Increase timeout in `_call_ai_service()` if needed
- Or switch to Ollama for faster local response

**Q: Always falling back to mock**
- Run `_initialize_ai_client()` to see what's available
- Check logs: `export DJANGO_LOG_LEVEL=DEBUG`

