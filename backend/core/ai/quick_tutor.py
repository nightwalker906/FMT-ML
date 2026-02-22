"""
=============================================================================
Quick Tutor AI — Homework Helper with Multi-LLM Backend
=============================================================================

Endpoint: POST /api/ai/quick-tutor/
Flow:
  1. Receive student question + optional conversation history.
  2. Optionally search the web via Serper for factual grounding.
  3. Call the best available LLM backend:
       Gemini  →  Groq (free)  →  Ollama (local)  →  Serper-enhanced fallback
  4. Return the AI response with markdown formatting.

Supported Backends (in priority order):
  - Google Gemini 1.5 Flash  (GEMINI_API_KEY)
  - Groq Cloud — Llama 3.3   (GROQ_API_KEY  — free at groq.com)
  - Ollama local              (auto-detected on localhost:11434)
  - Serper search synthesis   (SERPER_API_KEY — uses search results only)

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

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

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

# Rate limit: requests per IP per day
DAILY_RATE_LIMIT = 30

# Keywords that suggest the question needs web search grounding
WEB_SEARCH_TRIGGERS = [
    "latest", "recent", "current", "today", "2024", "2025", "2026",
    "news", "update", "who is", "what happened", "when did",
    "how many", "statistics", "data", "fact", "research",
    "definition of", "formula for", "equation",
]

SYSTEM_PROMPT = """You are **Quick Tutor**, an expert, patient AI tutor built into the "Find My Tutor" learning platform.

## Your Personality
- Warm, encouraging, and patient — like the best teacher a student ever had.
- You celebrate effort and curiosity.
- You use clear, simple language appropriate for the student's level.

## Your Rules
1. **Never just give the answer.** Guide the student step by step. Ask follow-up questions if needed.
2. **Use Markdown** for formatting: headers, bullet points, numbered lists, bold, code blocks, and LaTeX math (wrap in `$` for inline, `$$` for block).
3. **Structure your responses** with clear sections when explaining complex topics.
4. If web search results are provided, incorporate them naturally. Cite facts but explain them in your own words.
5. If you're unsure about something, say so honestly — don't make things up.
6. Keep responses concise but thorough. Aim for 150-400 words unless the topic requires more.
7. End with a guiding question or next-step suggestion when appropriate.

## Formatting Examples
- Math: $E = mc^2$ or $$\\int_0^\\infty e^{-x} dx = 1$$
- Code: Use fenced code blocks with language tags.
- Key terms: **Bold** them on first use.

## Context
You have access to web search results when the student asks factual or current-event questions. Use them to ground your answers in reality."""


# ─── Rate Limiting ────────────────────────────────────────────────────────────

def _get_client_ip(request):
    """Extract client IP from request."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    return xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR", "unknown")


def _check_rate_limit(request):
    """
    Check if the client has exceeded the daily rate limit.
    Returns (allowed: bool, remaining: int).
    """
    ip = _get_client_ip(request)
    cache_key = f"qt_rate_{ip}"
    now = time.time()

    history = cache.get(cache_key, [])
    # Remove entries older than 24 hours
    cutoff = now - 86400
    history = [t for t in history if t > cutoff]

    if len(history) >= DAILY_RATE_LIMIT:
        return False, 0

    history.append(now)
    cache.set(cache_key, history, 86400)
    return True, DAILY_RATE_LIMIT - len(history)


# ─── Serper Web Search ────────────────────────────────────────────────────────

def _needs_web_search(question):
    """Determine if the question would benefit from web search grounding."""
    q_lower = question.lower()
    return any(trigger in q_lower for trigger in WEB_SEARCH_TRIGGERS)


def _search_web(query, num_results=5):
    """
    Search the web using Serper API for factual grounding.
    Returns structured search results or empty dict on failure.
    """
    if not SERPER_API_KEY:
        logger.warning("SERPER_API_KEY not set — skipping web search.")
        return {}

    # Check cache first (10 minute TTL)
    cache_key = f"serper_qt_{hashlib.md5(query.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        response = http_requests.post(
            SERPER_URL,
            headers={
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "q": query,
                "num": num_results,
                "gl": "us",
                "hl": "en",
            },
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()

        results = {
            "organic": [],
            "answer_box": None,
            "knowledge_graph": None,
        }

        # Extract answer box
        if "answerBox" in data:
            ab = data["answerBox"]
            results["answer_box"] = {
                "title": ab.get("title", ""),
                "answer": ab.get("answer", ab.get("snippet", "")),
            }

        # Extract knowledge graph
        if "knowledgeGraph" in data:
            kg = data["knowledgeGraph"]
            results["knowledge_graph"] = {
                "title": kg.get("title", ""),
                "description": kg.get("description", ""),
                "type": kg.get("type", ""),
            }

        # Extract organic results
        for item in data.get("organic", [])[:num_results]:
            results["organic"].append({
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "link": item.get("link", ""),
            })

        cache.set(cache_key, results, 600)
        return results

    except http_requests.exceptions.Timeout:
        logger.warning("Serper API timeout for query: %s", query[:50])
        return {}
    except http_requests.exceptions.RequestException as e:
        logger.error("Serper API error: %s", str(e))
        return {}


def _format_search_context(results):
    """Format Serper results into a context string for the AI prompt."""
    if not results:
        return ""

    parts = ["## Web Search Results (for factual grounding)\n"]

    if results.get("answer_box"):
        ab = results["answer_box"]
        parts.append(f"**Quick Answer:** {ab['answer']}\n")

    if results.get("knowledge_graph"):
        kg = results["knowledge_graph"]
        parts.append(
            f"**{kg['title']}** ({kg['type']}): {kg['description']}\n"
        )

    for i, item in enumerate(results.get("organic", []), 1):
        parts.append(
            f"{i}. **{item['title']}**\n"
            f"   {item['snippet']}\n"
            f"   Source: {item['link']}\n"
        )

    return "\n".join(parts)


# ─── Detect Available Backend ─────────────────────────────────────────────────

def _detect_backend():
    """
    Detect the best available LLM backend.
    Priority: Gemini → Groq → Ollama → serper_only → none
    """
    if GEMINI_API_KEY:
        return "gemini"
    if GROQ_API_KEY:
        return "groq"
    # Check if Ollama is running locally
    try:
        r = http_requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        if r.status_code == 200:
            return "ollama"
    except Exception:
        pass
    if SERPER_API_KEY:
        return "serper_only"
    return "none"


# ─── Groq API Call ────────────────────────────────────────────────────────────

def _call_groq(question, history, search_context=""):
    """
    Call Groq API (free tier) with Llama 3.3 70B.
    Uses OpenAI-compatible endpoint.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add conversation history
    for msg in history[-10:]:
        role = "user" if msg.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": msg["content"]})

    # Build current user message
    user_message = question
    if search_context:
        user_message = (
            f"{question}\n\n---\n{search_context}\n---\n\n"
            f"Use the above web results to ground your answer in facts, "
            f"but explain everything in your own words as a tutor would."
        )

    messages.append({"role": "user", "content": user_message})

    try:
        response = http_requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2048,
                "top_p": 0.9,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        choices = data.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "").strip()

        return "I received an unexpected response. Please try asking again."

    except http_requests.exceptions.Timeout:
        logger.error("Groq API timeout")
        return None  # Signal to try next backend
    except http_requests.exceptions.RequestException as e:
        logger.error("Groq API error: %s", str(e))
        return None


# ─── Ollama Local Call ────────────────────────────────────────────────────────

def _call_ollama(question, history, search_context=""):
    """
    Call Ollama running locally for completely offline AI.
    """
    # Build prompt from history + question
    prompt_parts = [SYSTEM_PROMPT, "\n\n"]

    for msg in history[-10:]:
        role = "Student" if msg.get("role") == "user" else "Tutor"
        prompt_parts.append(f"{role}: {msg['content']}\n\n")

    user_message = question
    if search_context:
        user_message = (
            f"{question}\n\n---\n{search_context}\n---\n\n"
            f"Use the above web results to ground your answer."
        )

    prompt_parts.append(f"Student: {user_message}\n\nTutor:")

    try:
        response = http_requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": "".join(prompt_parts),
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 2048,
                },
            },
            timeout=60,  # Ollama can be slower
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()

    except Exception as e:
        logger.error("Ollama error: %s", str(e))
        return None


# ─── Serper-Powered Smart Response ────────────────────────────────────────────

def _serper_smart_search(query, num_results=5):
    """
    Perform a Serper search and return raw structured data.
    Separate from _search_web to avoid cache key conflicts.
    """
    if not SERPER_API_KEY:
        return {}

    cache_key = f"serper_smart_{hashlib.md5(query.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        response = http_requests.post(
            SERPER_URL,
            headers={
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
            },
            json={"q": query, "num": num_results, "gl": "us", "hl": "en"},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()
        cache.set(cache_key, data, 600)
        return data
    except Exception as e:
        logger.warning("Serper smart search error: %s", str(e))
        return {}


def _serper_only_response(question, search_context=""):
    """
    Generate a high-quality tutoring response using ONLY Serper search.
    
    Strategy:
    1. Main search for the question itself
    2. "Explain" search for tutorial/explanation content
    3. Extract answer boxes, knowledge graph, and top snippets
    4. Synthesize into a structured, tutor-like markdown response
    """
    if not SERPER_API_KEY:
        return _mock_response(question)

    # ── Multi-query search strategy ──
    main_results = _serper_smart_search(question, num_results=5)
    explain_results = _serper_smart_search(
        f"explain {question} simple tutorial", num_results=3
    )

    # ── Extract the best content ──
    answer_box = None
    knowledge_graph = None
    snippets = []
    sources = []

    # Main results
    if main_results:
        if "answerBox" in main_results:
            ab = main_results["answerBox"]
            answer_box = ab.get("answer", ab.get("snippet", ""))

        if "knowledgeGraph" in main_results:
            kg = main_results["knowledgeGraph"]
            knowledge_graph = {
                "title": kg.get("title", ""),
                "description": kg.get("description", ""),
                "type": kg.get("type", ""),
                "attributes": kg.get("attributes", {}),
            }

        for item in main_results.get("organic", [])[:5]:
            snippet = item.get("snippet", "")
            title = item.get("title", "")
            link = item.get("link", "")
            if snippet:
                snippets.append(snippet)
            if title and link:
                sources.append({"title": title, "link": link})

    # Explanation results (for richer content)
    if explain_results:
        for item in explain_results.get("organic", [])[:3]:
            snippet = item.get("snippet", "")
            if snippet and snippet not in snippets:
                snippets.append(snippet)

    # ── If we got nothing at all ──
    if not answer_box and not snippets and not knowledge_graph:
        return _mock_response(question)

    # ── Synthesize into a tutor-like response ──
    parts = []

    # Header
    parts.append("## Let me help you with that! 🎓\n")

    # Direct answer (if available from answer box)
    if answer_box:
        parts.append(f"**Quick Answer:** {answer_box}\n")

    # Knowledge graph info
    if knowledge_graph and knowledge_graph.get("description"):
        kg = knowledge_graph
        type_str = f" ({kg['type']})" if kg.get("type") else ""
        parts.append(f"### {kg.get('title', 'Overview')}{type_str}\n")
        parts.append(f"{kg['description']}\n")

        # Add any key attributes
        attrs = kg.get("attributes", {})
        if attrs:
            parts.append("")
            for key, value in list(attrs.items())[:5]:
                parts.append(f"- **{key}:** {value}")
            parts.append("")

    # Explanation from snippets
    if snippets:
        parts.append("\n### Here's what you need to know:\n")
        # Use the best snippets as explanation paragraphs
        for i, snippet in enumerate(snippets[:4]):
            # Clean up the snippet
            clean = snippet.strip()
            if clean:
                parts.append(f"{clean}\n")

    # Key takeaways (synthesized from snippets)
    if len(snippets) >= 2:
        parts.append("\n### 💡 Key Points\n")
        for i, snippet in enumerate(snippets[:3]):
            # Extract the first sentence as a key point
            first_sentence = snippet.split(". ")[0].strip()
            if first_sentence and not first_sentence.endswith("."):
                first_sentence += "."
            if first_sentence:
                parts.append(f"- {first_sentence}")
        parts.append("")

    # Sources
    if sources:
        parts.append("\n### 📚 Learn More\n")
        for src in sources[:4]:
            parts.append(f"- [{src['title']}]({src['link']})")
        parts.append("")

    # Guiding question
    parts.append(
        "\n---\n"
        "**🤔 Want to go deeper?** Try asking me a follow-up question "
        "about a specific part you'd like to understand better!"
    )

    return "\n".join(parts)


# ─── Gemini AI Call ───────────────────────────────────────────────────────────

def _call_gemini(question, history, search_context=""):
    """
    Call Gemini API with the student's question, conversation history,
    and optional web search context.
    """
    if not GEMINI_API_KEY:
        return None  # Signal to try next backend

    # Build the conversation contents
    contents = []

    # Add conversation history (last 10 messages for context window)
    for msg in history[-10:]:
        role = "user" if msg.get("role") == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}],
        })

    # Build the current user message with search context
    user_message = question
    if search_context:
        user_message = (
            f"{question}\n\n"
            f"---\n"
            f"{search_context}\n"
            f"---\n\n"
            f"Use the above web results to ground your answer in facts, "
            f"but explain everything in your own words as a tutor would."
        )

    contents.append({
        "role": "user",
        "parts": [{"text": user_message}],
    })

    try:
        response = http_requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "system_instruction": {
                    "parts": [{"text": SYSTEM_PROMPT}],
                },
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.7,
                    "topP": 0.9,
                    "topK": 40,
                    "maxOutputTokens": 2048,
                },
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                    },
                ],
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        # Extract text from response
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "I'm having trouble right now.")

        # Check for blocked content
        if data.get("promptFeedback", {}).get("blockReason"):
            return (
                "I can't help with that particular question as it may touch "
                "on sensitive topics. Could you rephrase it or ask about a "
                "different aspect of the subject?"
            )

        return "I received an unexpected response format. Please try asking again."

    except http_requests.exceptions.Timeout:
        logger.error("Gemini API timeout")
        return None  # Signal to try next backend
    except http_requests.exceptions.RequestException as e:
        logger.error("Gemini API error: %s", str(e))
        return None  # Signal to try next backend


def _call_ai(question, history, search_context=""):
    """
    Cascading AI call: tries each backend in priority order.
    Returns (answer_text, backend_name) tuple.
    """
    backend = _detect_backend()
    logger.info("Detected best backend: %s", backend)

    # Try Gemini first
    if GEMINI_API_KEY:
        logger.info("Trying Gemini...")
        result = _call_gemini(question, history, search_context)
        if result:
            return result, "gemini"

    # Try Groq (free)
    if GROQ_API_KEY:
        logger.info("Trying Groq (Llama 3.3)...")
        result = _call_groq(question, history, search_context)
        if result:
            return result, "groq"

    # Try Ollama (local)
    try:
        r = http_requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        if r.status_code == 200:
            logger.info("Trying Ollama (local)...")
            result = _call_ollama(question, history, search_context)
            if result:
                return result, "ollama"
    except Exception:
        pass

    # Serper-only fallback
    if SERPER_API_KEY:
        logger.info("Falling back to Serper-only response...")
        result = _serper_only_response(question, search_context)
        return result, "serper_only"

    # Absolute fallback
    return _mock_response(question), "mock"


def _mock_response(question):
    """Fallback mock response when no AI service is available."""
    return (
        f"## I'd love to help! 🎓\n\n"
        f"You asked: *\"{question[:100]}\"*\n\n"
        f"I'm currently running without an AI backend configured. "
        f"Here's how to enable **free AI tutoring** (takes 2 minutes):\n\n"
        f"### Quickest Option — Groq (Free)\n"
        f"1. Go to [console.groq.com](https://console.groq.com)\n"
        f"2. Sign up (free) and create an API key\n"
        f"3. Add `GROQ_API_KEY=your_key` to your `.env` file\n"
        f"4. Restart the server — that's it! 🚀\n\n"
        f"### Local Option — Ollama (No API Key Needed)\n"
        f"1. Install Ollama from [ollama.ai](https://ollama.ai)\n"
        f"2. Run: `ollama pull mistral`\n"
        f"3. Start: `ollama serve`\n\n"
        f"---\n"
        f"*💡 In the meantime, try asking a human tutor! "
        f"Go to **Find a Tutor** to connect with an expert.*"
    )


# ─── API View ─────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def quick_tutor_chat(request):
    """
    Quick Tutor AI Chat Endpoint

    POST /api/ai/quick-tutor/

    Accepts a student question, optionally searches the web for context,
    and returns an AI-generated tutoring response.

    Rate limited: 30 requests/day per IP.
    """
    # ── Rate limiting ──
    allowed, remaining = _check_rate_limit(request)
    if not allowed:
        return Response(
            {
                "status": "error",
                "error": (
                    "You've reached the daily limit (30 questions/day). "
                    "Come back tomorrow! 📚"
                ),
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # ── Validate input ──
    question = request.data.get("question", "").strip()
    if not question:
        return Response(
            {"status": "error", "error": "Please provide a question."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(question) > 2000:
        return Response(
            {
                "status": "error",
                "error": "Question is too long (max 2000 characters).",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    history = request.data.get("history", [])
    if not isinstance(history, list):
        history = []

    # ── Web search (if needed or if Serper is our only backend) ──
    search_context = ""
    has_sources = False
    backend_hint = _detect_backend()

    # Always search if Serper is our primary backend, or if question has triggers
    if _needs_web_search(question) or backend_hint == "serper_only":
        logger.info("Web search triggered for: %s", question[:60])
        search_results = _search_web(question)
        if search_results:
            search_context = _format_search_context(search_results)
            has_sources = True

    # ── Call AI (cascading backend) ──
    logger.info("Quick Tutor request: %s", question[:80])
    start = time.time()

    answer, backend_used = _call_ai(question, history, search_context)

    elapsed = time.time() - start
    logger.info(
        "Quick Tutor response via %s in %.2fs (sources=%s)",
        backend_used,
        elapsed,
        has_sources,
    )

    return Response(
        {
            "status": "success",
            "answer": answer,
            "has_sources": has_sources,
            "model": backend_used,
            "response_time": round(elapsed, 2),
            "remaining_requests": remaining,
        }
    )
