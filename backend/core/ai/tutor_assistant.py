"""
=============================================================================
Tutor AI Command Center — Internal assistant for tutors on the FMT platform.
=============================================================================

Endpoint: POST /api/ai/tutor-command/

Uses the SAME cascading multi-LLM backend as Quick Tutor:
  Gemini → Groq (free) → Ollama (local) → Serper-smart → Mock fallback

Author: FMT Development Team
Date: February 2026
=============================================================================
"""

import os
import json
import logging
import time
import hashlib

import requests as http_requests
from django.conf import settings
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Configuration (shared keys with Quick Tutor) ─────────────────────────────

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

GEMINI_MODEL = "gemini-1.5-flash"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral")

SERPER_URL = "https://google.serper.dev/search"

DAILY_RATE_LIMIT = 40  # Generous limit for tutors

# ─── System Prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are the **FMT Internal Assistant** — the smart, built-in AI helper for tutors on the **Find My Tutor (FMT)** education platform.

## Your Role
You help tutors with:
1. **Platform questions** — How FMT works: bookings, payouts, profiles, reviews, messaging.
2. **Teaching advice** — Lesson planning, student engagement, classroom management, pedagogy.
3. **Administrative tasks** — Drafting messages, creating schedules, summarizing data.
4. **Subject-matter help** — Quick refreshers on academic topics the tutor teaches.

## Platform Knowledge (FMT)

### Bookings & Sessions
- Students find tutors via search or AI-powered recommendations.
- Students send **booking requests** specifying subject, date, time, and notes.
- Tutors can **accept** or **decline** requests from their dashboard.
- Sessions are typically 1 hour but can vary.

### Payments & Payouts
- Tutors set their own **hourly rate** (in South African Rands, R).
- The platform has a Smart Pricing AI tool to help set competitive rates.
- Payouts are processed after completed sessions.

### Profile & Settings
- Tutor profiles show: subjects, qualifications, experience, teaching style, bio, hourly rate.
- A complete profile increases visibility in search results and recommendations.

### Reviews & Ratings
- After sessions, students leave ratings (1-5 stars) and written reviews.
- Higher ratings improve search ranking and recommendation scores.

### Messaging
- Built-in real-time messaging between tutors and students.

### AI Features
- **Smart Pricing** — AI-powered hourly rate recommendation.
- **Smart Recommendations** — ML system that matches students with tutors.
- **Study Planner** — AI-generated study plans for students.
- **Quick Tutor AI** — AI homework helper for students.

## Your Personality
- **Professional yet friendly** — like a knowledgeable colleague.
- **Concise** — respect the tutor's time. Aim for 100-300 words unless more is needed.
- **Actionable** — give specific, practical advice.
- **Encouraging** — support tutors in their teaching journey.

## Formatting Rules
- Use **Markdown**: headers, bullet points, numbered lists, bold, code blocks.
- Structure complex answers with clear sections.
- Use emoji sparingly for warmth (1-2 max per response).
- If you don't know something specific to the platform, say so honestly.
- Never invent features that don't exist.
"""


# ─── Rate Limiting ────────────────────────────────────────────────────────────

def _get_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    return xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR", "unknown")


def _check_rate_limit(request):
    ip = _get_ip(request)
    key = f"tc_rate_{ip}"
    now = time.time()
    history = cache.get(key, [])
    history = [t for t in history if t > now - 86400]
    if len(history) >= DAILY_RATE_LIMIT:
        return False, 0
    history.append(now)
    cache.set(key, history, 86400)
    return True, DAILY_RATE_LIMIT - len(history)


# ─── Serper Web Search ────────────────────────────────────────────────────────

def _search_web(query, num_results=5):
    """Search the web using Serper for factual grounding."""
    if not SERPER_API_KEY:
        return {}

    cache_key = f"serper_tc_{hashlib.md5(query.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        resp = http_requests.post(
            SERPER_URL,
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": num_results, "gl": "us", "hl": "en"},
            timeout=8,
        )
        resp.raise_for_status()
        data = resp.json()
        cache.set(cache_key, data, 600)
        return data
    except Exception as e:
        logger.warning("Serper search error: %s", str(e))
        return {}


# ─── LLM Backend Calls ────────────────────────────────────────────────────────

def _call_gemini(query):
    if not GEMINI_API_KEY:
        return None
    try:
        resp = http_requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": [{"role": "user", "parts": [{"text": query}]}],
                "generationConfig": {
                    "temperature": 0.65,
                    "topP": 0.85,
                    "topK": 40,
                    "maxOutputTokens": 1536,
                },
                "safetySettings": [
                    {"category": c, "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
                    for c in [
                        "HARM_CATEGORY_HARASSMENT",
                        "HARM_CATEGORY_HATE_SPEECH",
                        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "HARM_CATEGORY_DANGEROUS_CONTENT",
                    ]
                ],
            },
            timeout=25,
        )
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "").strip()
        return None
    except Exception as e:
        logger.error("Gemini error (tutor-command): %s", str(e))
        return None


def _call_groq(query):
    if not GROQ_API_KEY:
        return None
    try:
        resp = http_requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": query},
                ],
                "temperature": 0.65,
                "max_tokens": 1536,
                "top_p": 0.85,
            },
            timeout=25,
        )
        resp.raise_for_status()
        choices = resp.json().get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "").strip()
        return None
    except Exception as e:
        logger.error("Groq error (tutor-command): %s", str(e))
        return None


def _call_ollama(query):
    try:
        r = http_requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        if r.status_code != 200:
            return None
    except Exception:
        return None
    try:
        resp = http_requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": f"{SYSTEM_PROMPT}\n\nTutor asks: {query}\n\nAssistant:",
                "stream": False,
                "options": {"temperature": 0.65, "num_predict": 1536},
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except Exception as e:
        logger.error("Ollama error (tutor-command): %s", str(e))
        return None


def _serper_smart_response(query):
    """
    Generate a high-quality response using ONLY Serper web search.
    Does multiple searches and synthesizes results into a helpful answer.
    """
    if not SERPER_API_KEY:
        return None

    main_data = _search_web(query, num_results=5)
    explain_data = _search_web(f"{query} tips advice guide for tutors", num_results=3)

    answer_box = None
    knowledge_graph = None
    snippets = []
    sources = []

    # Main results
    if main_data:
        if "answerBox" in main_data:
            ab = main_data["answerBox"]
            answer_box = ab.get("answer", ab.get("snippet", ""))
        if "knowledgeGraph" in main_data:
            kg = main_data["knowledgeGraph"]
            knowledge_graph = {
                "title": kg.get("title", ""),
                "description": kg.get("description", ""),
                "type": kg.get("type", ""),
            }
        for item in main_data.get("organic", [])[:5]:
            snippet = item.get("snippet", "")
            if snippet:
                snippets.append(snippet)
            title = item.get("title", "")
            link = item.get("link", "")
            if title and link:
                sources.append({"title": title, "link": link})

    # Explanation results
    if explain_data:
        for item in explain_data.get("organic", [])[:3]:
            snippet = item.get("snippet", "")
            if snippet and snippet not in snippets:
                snippets.append(snippet)

    if not answer_box and not snippets and not knowledge_graph:
        return None

    # Synthesize response
    parts = ["## Here's what I found 🎓\n"]

    if answer_box:
        parts.append(f"**Quick Answer:** {answer_box}\n")

    if knowledge_graph and knowledge_graph.get("description"):
        kg = knowledge_graph
        type_str = f" ({kg['type']})" if kg.get("type") else ""
        parts.append(f"### {kg.get('title', 'Overview')}{type_str}\n")
        parts.append(f"{kg['description']}\n")

    if snippets:
        parts.append("\n### Key Information\n")
        for snippet in snippets[:4]:
            parts.append(f"{snippet.strip()}\n")

    if len(snippets) >= 2:
        parts.append("\n### 💡 Key Takeaways\n")
        for snippet in snippets[:3]:
            first = snippet.split(". ")[0].strip()
            if first and not first.endswith("."):
                first += "."
            if first:
                parts.append(f"- {first}")
        parts.append("")

    if sources:
        parts.append("\n### 📚 Learn More\n")
        for src in sources[:4]:
            parts.append(f"- [{src['title']}]({src['link']})")
        parts.append("")

    parts.append(
        "\n---\n"
        "**Need more detail?** Try asking a follow-up question!"
    )

    return "\n".join(parts)


def _mock_response(query):
    """Fallback when no AI or search service is available."""
    return (
        f"## FMT Assistant\n\n"
        f"You asked: *\"{query[:120]}\"*\n\n"
        f"I'm running without an AI backend right now. "
        f"Here's how to enable **free AI** (2 minutes):\n\n"
        f"### Quickest — Groq (Free)\n"
        f"1. Go to [console.groq.com](https://console.groq.com)\n"
        f"2. Sign up (free) → Create API Key\n"
        f"3. Add `GROQ_API_KEY=your_key` to `.env`\n"
        f"4. Restart the server 🚀\n\n"
        f"### Local — Ollama (No Key Needed)\n"
        f"1. Install from [ollama.ai](https://ollama.ai)\n"
        f"2. Run: `ollama pull mistral && ollama serve`\n\n"
        f"---\n"
        f"*In the meantime I can still answer if you have "
        f"a **Serper API key** set — I'll search the web for you!*"
    )


def _call_ai(query):
    """
    Cascading AI call — same pattern as Quick Tutor.
    Returns (answer_text, backend_name).
    """
    # 1. Gemini
    if GEMINI_API_KEY:
        logger.info("Tutor Command: trying Gemini...")
        result = _call_gemini(query)
        if result:
            return result, "gemini"

    # 2. Groq (free)
    if GROQ_API_KEY:
        logger.info("Tutor Command: trying Groq...")
        result = _call_groq(query)
        if result:
            return result, "groq"

    # 3. Ollama (local)
    logger.info("Tutor Command: trying Ollama...")
    result = _call_ollama(query)
    if result:
        return result, "ollama"

    # 4. Serper-smart
    if SERPER_API_KEY:
        logger.info("Tutor Command: falling back to Serper-smart...")
        result = _serper_smart_response(query)
        if result:
            return result, "serper_smart"

    # 5. Mock
    return _mock_response(query), "mock"


# ─── API View ─────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def tutor_command_chat(request):
    """
    Tutor AI Command Center Endpoint.

    POST /api/ai/tutor-command/

    Accepts a tutor's query and returns an AI-generated response.
    Uses cascading backend: Gemini → Groq → Ollama → Serper → Mock.

    Rate limited: 40 requests/day per IP.
    """
    # Rate limit
    allowed, remaining = _check_rate_limit(request)
    if not allowed:
        return Response(
            {
                "status": "error",
                "error": "Daily limit reached (40 queries). Come back tomorrow! ☕",
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Validate
    query = request.data.get("query", "").strip()
    if not query:
        return Response(
            {"status": "error", "error": "Please provide a query."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(query) > 1500:
        return Response(
            {"status": "error", "error": "Query too long (max 1500 characters)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tutor_id = request.data.get("tutor_id")

    # Cache check
    q_hash = hashlib.md5(f"{query}:{tutor_id or ''}".encode()).hexdigest()
    cache_key = f"tc_result_{q_hash}"
    cached = cache.get(cache_key)
    if cached:
        logger.info("Tutor Command cache hit: %s", query[:50])
        return Response({
            "status": "success",
            "answer": cached["answer"],
            "model": cached["model"],
            "response_time": 0.0,
            "cached": True,
            "remaining_requests": remaining,
        })

    # Call AI
    logger.info("Tutor Command from %s: %s", tutor_id or "anon", query[:80])
    start = time.time()

    answer, backend = _call_ai(query)

    elapsed = time.time() - start
    logger.info("Tutor Command via %s in %.2fs", backend, elapsed)

    # Cache for 5 minutes
    cache.set(cache_key, {"answer": answer, "model": backend}, 300)

    return Response({
        "status": "success",
        "answer": answer,
        "model": backend,
        "response_time": round(elapsed, 2),
        "cached": False,
        "remaining_requests": remaining,
    })
