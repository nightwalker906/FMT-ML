# 🚀 AI Service Setup Guide

**Current Status**: Template plan fallback is working ✅

The system works perfectly with or without AI, but here are your options for AI-generated plans:

## Option 1: Ollama (Recommended) 🌟
**Pros**: Completely free, local, works offline, no API key needed  
**Cons**: Requires ~5GB download and ~2GB RAM

### Quick Setup:
```bash
# 1. Download from https://ollama.ai
# 2. Install and run:
ollama pull mistral

# 3. Start the service:
ollama serve

# That's it! The backend will auto-detect it.
```

**Verification**:
```bash
# Should return a list of models if working:
curl http://localhost:11434/api/tags
```

---

## Option 2: Hugging Face (Cloud) 
**Pros**: No local setup needed, various model options  
**Cons**: Requires internet, free API key (limited rate)

### Quick Setup:
```bash
# 1. Get free API token at https://huggingface.co/settings/tokens
# 2. Add to backend/.env:
HF_API_KEY=hf_YOUR_TOKEN_HERE

# 3. Restart Django backend
```

---

## Option 3: Stay with Templates (Current)
**Pros**: Works perfectly, no setup needed  
**Cons**: Plans not AI-generated

The fallback system generates smart template plans automatically. Perfect for testing! 

---

## How to Know Which is Running

Check the API response badge:
```
✨ "AI-Generated" = Ollama or Hugging Face is working
📋 "Template Plan" = Using fallback (current state)
```

---

## What to Do Next

### If you want AI-generated plans:
Pick **Option 1 (Ollama)** or **Option 2 (Hugging Face)**

### If template plans are fine:
**Nothing to do!** Everything is working. 

The template system intelligently creates plans based on:
- Your learning goal
- Areas to improve  
- Duration (1-12 weeks)
- Weekly breakdown with objectives, action items, resources, milestones

---

## Testing the API Directly

```bash
# Test with curl (replace YOUR_GOAL, YOUR_WEAKNESS):
curl -X POST http://localhost:8000/api/generate-plan/ \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Learn Python",
    "weakness": "OOP and algorithms",
    "weeks": 4,
    "context": ""
  }'
```

---

## Backend Status

- ✅ Django running on `http://localhost:8000`
- ✅ Study Planner API at `http://localhost:8000/api/generate-plan/`
- ✅ Template fallback active
- ⏳ Ollama: Not detected (optional)
- ⏳ Hugging Face: No API key (optional)

---

## Recommendation

**For Best Experience:**
1. **Right now**: Start using Study Planner with templates (working perfectly!)
2. **Later**: Install Ollama for AI-generated plans

The template system is actually quite good and will work immediately without any setup!
