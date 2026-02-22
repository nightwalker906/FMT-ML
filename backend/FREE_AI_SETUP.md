# Free AI Integration for Study Planner

## Overview
The study planner now uses **free** AI services instead of Gemini. Choose one:

### Option 1: Ollama (Recommended - Completely Local)
- **No API key needed**
- **Runs on your computer**
- **Fastest option**

#### Setup:
```bash
# 1. Install Ollama from https://ollama.ai

# 2. Pull a model (choose one):
ollama pull mistral    # Fast, good quality
ollama pull llama2     # Better quality, slower
ollama pull neural-chat # Good for conversations

# 3. Start Ollama (runs in background):
ollama serve

# 4. Test it's running:
curl http://localhost:11434/api/tags
```

**No .env configuration needed** - the code auto-detects Ollama on localhost:11434

---

### Option 2: Hugging Face Inference API (Free with Account)
- **Free tier available**
- **Cloud-based**
- **No local setup needed**

#### Setup:
```bash
# 1. Sign up at https://huggingface.co (free)

# 2. Get your API token:
#    - Go to https://huggingface.co/settings/tokens
#    - Click "New token"
#    - Select "Read" permissions
#    - Copy the token

# 3. Add to .env:
HF_API_KEY=hf_xxxxx_your_token_here
```

**Models used (automatic fallback):**
- `mistralai/Mistral-7B-Instruct-v0.1` (fastest)
- `meta-llama/Llama-2-7b-chat-hf` (best quality, requires approval)
- `tiiuae/falcon-7b-instruct` (good balance)

---

### Option 3: Together.ai (Free Tier)
- **Free tier with usage limits**
- **Cloud-based**

#### Setup:
```bash
# 1. Sign up at https://together.ai (free)

# 2. Get API key from dashboard

# 3. Add to .env:
TOGETHER_API_KEY=xxxxx
```

---

## How It Works

The code automatically tries AI services in this order:

1. **Ollama** (if running locally)
2. **Hugging Face** (if HF_API_KEY is set)
3. **Mock/Fallback** (if neither available)

### Example Usage:

```python
from core.study_planner import generate_study_plan

result = generate_study_plan(
    student_goal="Master Python for interviews",
    weak_areas="Object-oriented programming and decorators",
    duration_weeks=4
)

print(result['plan'])  # Your study plan
print(result['status'])  # 'success' or 'fallback'
```

---

## Troubleshooting

### "No AI service available, using mock plan"
- If **Ollama**: Make sure `ollama serve` is running
- If **Hugging Face**: Set `HF_API_KEY` in .env and restart Django

### "Model timeout"
- Hugging Face models might be cold-starting (first call takes 30-60s)
- Ollama running locally? Make sure you pulled the model: `ollama pull mistral`

### "429 Too Many Requests" (Hugging Face)
- Free tier has rate limits
- Try switching to Ollama for unlimited local usage

---

## Quick Tutor AI — Backend Setup

Quick Tutor uses a **cascading backend** system — it tries each AI service in
order and uses the first one that responds:

```
Gemini  →  Groq (free)  →  Ollama (local)  →  Serper search-only  →  Mock
```

### Option A: Groq Cloud (Recommended — Free & Fast)

Groq provides free access to Llama 3.3 70B with very fast inference.

```bash
# 1. Sign up at https://console.groq.com (free, no credit card)
# 2. Create an API key from the dashboard
# 3. Add to backend/.env:
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
# 4. Restart Django server
```

**Free tier limits:** ~30 requests/minute, 14,400/day — more than enough.

### Option B: Google Gemini (Free Tier)

```bash
# 1. Go to https://aistudio.google.com/apikey
# 2. Click "Create API Key"
# 3. Add to backend/.env:
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxx
# 4. Restart Django server
```

**Free tier limits:** 15 requests/minute, 1,500/day.

### Option C: Ollama (Local — No API Key Needed)

```bash
# 1. Install from https://ollama.ai
# 2. Pull a model:
ollama pull mistral
# 3. Start the server:
ollama serve
# Quick Tutor auto-detects Ollama on localhost:11434
```

### Option D: Serper Search Only (Already Configured!)

If no LLM is available, Quick Tutor falls back to **Serper web search** — it
searches the web for your question and returns structured results. Not as
conversational as an LLM, but still useful for factual questions.

This works right now with `SERPER_API_KEY` already set in your `.env`.

---

## Recommendations

| Use Case | Best Option |
|----------|------------|
| Development (no internet) | Ollama (local) |
| Production (scalable) | Ollama + Hugging Face fallback |
| Quick testing | Hugging Face (no setup) |
| High volume | Ollama (local, unlimited) |
| **Quick Tutor — fastest setup** | **Groq (free, 2-min signup)** |
| **Quick Tutor — no signup** | **Ollama (local, offline)** |

