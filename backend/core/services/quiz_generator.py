"""
Quiz generation service for Virtual Classroom (Phase 2).

Responsibilities:
- Fetch a lesson transcript from CourseSession.
- Call an LLM (Gemini/Groq/Ollama) to generate a strict JSON quiz.
- Validate and persist Quiz + QuizQuestion records as a draft.

NOTE:
This reuses the same environment variables used by the Study Planner:
  - GEMINI_API_KEY, GROQ_API_KEY, OLLAMA_URL, OLLAMA_MODEL
  - SERPER_API_KEY (fallback topic hints)
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from collections import Counter
from typing import Any, Dict, List

import requests
from django.db import transaction
from dotenv import load_dotenv

from ..models import CourseSession, Quiz, QuizQuestion
from ..serper_service import SerperSearchService

load_dotenv()

logger = logging.getLogger(__name__)

SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral")

# Prompt engineered to force strict JSON output.
QUIZ_PROMPT_TEMPLATE = """You are an experienced tutor. Read the lesson transcript below and write a quiz.

RULES:
- Generate EXACTLY 3 multiple-choice questions.
- Each question MUST have 4 options.
- Questions must be based ONLY on the transcript content.
- Do NOT add any extra text, formatting, or markdown.
- Output ONLY a raw JSON array (no surrounding text).

JSON OUTPUT FORMAT (example):
[
  {{
    "question_text": "Question here",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "explanation": "Short explanation here"
  }}
]

Lesson Transcript:
{transcript}
"""


def _call_gemini(prompt: str) -> str | None:
    """Call Google Gemini (REST) and return raw text."""
    if not GEMINI_API_KEY:
        return None
    try:
        resp = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "topP": 0.9,
                    "topK": 40,
                    "maxOutputTokens": 900,
                },
            },
            timeout=25,
        )
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return None
        text = parts[0].get("text", "")
        return text.strip() if text else None
    except Exception:
        logger.exception("Gemini quiz generation failed.")
        return None


def _call_groq(prompt: str) -> str | None:
    """Call Groq (OpenAI-compatible) and return raw text."""
    if not GROQ_API_KEY:
        return None
    try:
        resp = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "top_p": 0.9,
                "max_tokens": 900,
            },
            timeout=25,
        )
        resp.raise_for_status()
        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            return None
        content = choices[0].get("message", {}).get("content", "")
        return content.strip() if content else None
    except Exception:
        logger.exception("Groq quiz generation failed.")
        return None


def _call_ollama(prompt: str) -> str | None:
    """Call local Ollama (if running) and return raw text."""
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=25,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data.get("response", "")
        return text.strip() if text else None
    except Exception:
        return None


def _call_llm(prompt: str) -> str:
    """Try Gemini -> Groq -> Ollama, then raise a clear error."""
    result = _call_gemini(prompt)
    if result:
        return result

    result = _call_groq(prompt)
    if result:
        return result

    result = _call_ollama(prompt)
    if result:
        return result

    raise RuntimeError(
        "No LLM backend is configured. Please set GEMINI_API_KEY or GROQ_API_KEY."
    )

def _extract_json_array(raw_text: str) -> List[Dict[str, Any]]:
    """Parse and validate a JSON array from LLM output."""
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        # Try to salvage a JSON array if the model returned extra text.
        start = raw_text.find("[")
        end = raw_text.rfind("]")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("AI returned invalid JSON output.")
        try:
            payload = json.loads(raw_text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise ValueError("AI returned invalid JSON output.") from exc

    if not isinstance(payload, list):
        raise ValueError("AI output must be a JSON array.")
    if len(payload) != 3:
        raise ValueError("AI must return exactly 3 questions.")

    validated: List[Dict[str, Any]] = []
    for idx, item in enumerate(payload):
        if not isinstance(item, dict):
            raise ValueError(f"Question {idx + 1} is not a JSON object.")

        question_text = str(item.get("question_text", "")).strip()
        options = item.get("options")
        correct_index = item.get("correct_index")
        explanation = str(item.get("explanation", "")).strip()

        if not question_text:
            raise ValueError(f"Question {idx + 1} has empty text.")
        if not isinstance(options, list) or len(options) != 4:
            raise ValueError(f"Question {idx + 1} must have exactly 4 options.")
        options = [str(opt).strip() for opt in options]
        if any(not opt for opt in options):
            raise ValueError(f"Question {idx + 1} has empty options.")
        if not isinstance(correct_index, int) or correct_index not in range(4):
            raise ValueError(f"Question {idx + 1} has an invalid correct_index.")
        if not explanation:
            raise ValueError(f"Question {idx + 1} must include an explanation.")

        validated.append(
            {
                "question_text": question_text,
                "options": options,
                "correct_index": correct_index,
                "explanation": explanation,
            }
        )

    return validated


_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "your",
    "you",
    "are",
    "was",
    "were",
    "have",
    "has",
    "had",
    "will",
    "shall",
    "can",
    "could",
    "should",
    "into",
    "about",
    "they",
    "them",
    "their",
    "then",
    "there",
    "when",
    "where",
    "what",
    "which",
    "while",
    "also",
    "because",
    "just",
    "than",
    "over",
    "under",
    "more",
    "most",
    "less",
}


def _normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _split_fragments(text: str) -> List[str]:
    """Split transcript into sentence-like fragments."""
    raw = re.split(r"(?<=[.!?])\s+|[\r\n]+|[;:]+", text)
    fragments = []
    for chunk in raw:
        cleaned = _normalize_space(chunk)
        if len(cleaned) >= 25:
            fragments.append(cleaned)

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for frag in fragments:
        key = frag.lower()
        if key not in seen:
            seen.add(key)
            unique.append(frag)
    return unique


def _window_fragments(text: str, min_words: int = 12, step: int = 8, limit: int = 12) -> List[str]:
    """Create extra fragments using a sliding window if the transcript is short."""
    words = _normalize_space(text).split()
    if len(words) < min_words:
        return []

    chunks = []
    for idx in range(0, len(words) - min_words + 1, step):
        chunk = " ".join(words[idx : idx + min_words])
        if len(chunk) >= 25:
            chunks.append(chunk)
        if len(chunks) >= limit:
            break
    return chunks


def _extract_top_keywords(text: str, limit: int = 6) -> List[str]:
    tokens = re.findall(r"[A-Za-z][A-Za-z'-]{2,}", text.lower())
    counts = Counter(t for t in tokens if t not in _STOPWORDS)
    return [term for term, _ in counts.most_common(limit)]


def _serper_topic_hints(transcript: str) -> List[str]:
    """Use Serper search to identify topic hints that also appear in transcript."""
    if not SERPER_API_KEY:
        return []

    keywords = _extract_top_keywords(transcript, limit=6)
    if not keywords:
        return []

    query = " ".join(keywords[:4])
    try:
        service = SerperSearchService()
        results = service.search(query, num_results=5)
    except Exception:
        logger.warning("Serper search failed for quiz fallback.")
        return []

    transcript_lower = transcript.lower()
    hint_text = " ".join(r.get("title", "") for r in results)
    hint_tokens = re.findall(r"[A-Za-z][A-Za-z'-]{2,}", hint_text)
    hints: List[str] = []
    for token in hint_tokens:
        candidate = token.lower()
        if candidate in _STOPWORDS:
            continue
        if candidate in transcript_lower and candidate not in hints:
            hints.append(candidate)
        if len(hints) >= 6:
            break
    return hints


def _stable_shuffle(options: List[str], seed: str) -> List[str]:
    return sorted(options, key=lambda val: hashlib.md5(f"{seed}:{val}".encode()).hexdigest())


def _pick_keyword(sentence: str, hints: List[str]) -> str | None:
    lowered = sentence.lower()
    for hint in hints:
        if hint in lowered:
            return hint
    for token in re.findall(r"[A-Za-z][A-Za-z'-]{2,}", sentence):
        candidate = token.lower()
        if candidate not in _STOPWORDS:
            return candidate
    return None


def _trim_option(text: str, max_len: int = 180) -> str:
    cleaned = _normalize_space(text)
    if len(cleaned) <= max_len:
        return cleaned
    trimmed = cleaned[: max_len - 3].rsplit(" ", 1)[0]
    return f"{trimmed}..."


def _generate_fallback_quiz(transcript: str) -> List[Dict[str, Any]]:
    """
    Transcript-only fallback for environments without an LLM.
    Generates 3 questions with statements pulled from the transcript.
    """
    fragments = _split_fragments(transcript)
    if len(fragments) < 4:
        fragments.extend(_window_fragments(transcript))

    # Deduplicate again after adding window fragments
    seen = set()
    candidates = []
    for frag in fragments:
        key = frag.lower()
        if key not in seen:
            seen.add(key)
            candidates.append(frag)

    if len(candidates) < 4:
        raise ValueError("Transcript is too short to generate a quiz.")

    hints = _serper_topic_hints(transcript)
    focus = [s for s in candidates if any(h in s.lower() for h in hints)]
    if len(focus) < 3:
        for candidate in candidates:
            if candidate not in focus:
                focus.append(candidate)
            if len(focus) >= 3:
                break

    questions: List[Dict[str, Any]] = []
    for idx in range(3):
        correct = focus[idx % len(focus)]
        distractors = [s for s in candidates if s != correct]
        options = [_trim_option(correct)] + [_trim_option(s) for s in distractors[:3]]
        shuffled = _stable_shuffle(options, seed=f"quiz-{idx}")
        correct_index = shuffled.index(_trim_option(correct))
        keyword = _pick_keyword(correct, hints)
        question_text = (
            f"According to the lesson, what was said about {keyword}?"
            if keyword
            else "Which statement was mentioned in the lesson?"
        )
        questions.append(
            {
                "question_text": question_text,
                "options": shuffled,
                "correct_index": correct_index,
                "explanation": "This statement appears in the lesson transcript.",
            }
        )

    return questions


def generate_quiz_from_transcript(session_id: str) -> str:
    """
    Generate a draft quiz for a given session transcript.

    Returns:
        quiz_id (str)
    """
    session = CourseSession.objects.get(id=session_id)
    transcript = (session.transcript or "").strip()
    if not transcript:
        raise ValueError("This session does not have a transcript to generate a quiz from.")

    # Limit transcript length to reduce token usage.
    safe_transcript = transcript[-12000:] if len(transcript) > 12000 else transcript
    prompt = QUIZ_PROMPT_TEMPLATE.format(transcript=safe_transcript)

    try:
        raw_text = _call_llm(prompt)
        questions = _extract_json_array(raw_text)
    except Exception as exc:
        if SERPER_API_KEY:
            logger.warning("LLM quiz generation failed; using transcript-only fallback.")
            questions = _generate_fallback_quiz(safe_transcript)
        else:
            raise exc

    with transaction.atomic():
        quiz = Quiz.objects.create(
            course_session=session,
            title=f"{session.title} Quiz",
            is_published=False,
        )
        QuizQuestion.objects.bulk_create(
            [
                QuizQuestion(
                    quiz=quiz,
                    question_text=q["question_text"],
                    options=q["options"],
                    correct_index=q["correct_index"],
                    explanation=q["explanation"],
                )
                for q in questions
            ]
        )

    return str(quiz.id)
