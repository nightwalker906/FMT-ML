"""
=============================================================================
Find My Tutor (FMT) - AI Study Planner Module
=============================================================================

This module implements an AI-powered Study Planner using multiple LLM services.
It generates personalized, week-by-week study plans based on student goals.

GENERATIVE AI OVERVIEW:
-----------------------
Service Priority (cascading — same backend system as Quick Tutor):
1. Google Gemini 1.5 Flash  (GEMINI_API_KEY)
2. Groq Cloud — Llama 3.3   (GROQ_API_KEY — free at groq.com)
3. Ollama local              (auto-detected on localhost:11434)
4. Serper-enhanced template  (SERPER_API_KEY — web search + templates)
5. Template fallback         (no API key required)

PROMPT ENGINEERING STRATEGY:
----------------------------
1. ROLE ASSIGNMENT: "Act as a Senior Academic Advisor"
   - Gives the model a persona with expertise
   
2. CONTEXT SETTING: Provide student's goals, weaknesses, timeframe
   - Helps model generate relevant content
   
3. OUTPUT FORMAT: Request structured JSON
   - Ensures parseable, consistent responses
   
4. CONSTRAINTS: Specify week count, action items per week
   - Controls response scope and detail level

Author: FMT Development Team
Date: January 2026 (Updated February 2026 — Multi-LLM Backend)
=============================================================================
"""

import os
import json
import logging
import re
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import Serper search service
from .serper_service import SerperSearchService, search_for_study_resources

# Configure logging
logger = logging.getLogger(__name__)

# =============================================================================
# AI CONFIGURATION (shared keys with Quick Tutor)
# =============================================================================

SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
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


# =============================================================================
# STUDY PLAN PROMPT
# =============================================================================

STUDY_PLAN_SYSTEM_PROMPT = """You are a Senior Academic Advisor AI built into the "Find My Tutor" education platform.

Your job is to create a detailed, personalized, week-by-week study plan.

## Rules
1. Return ONLY valid JSON — no markdown, no commentary, no code fences.
2. The JSON must be an array of weekly objects.
3. Each object MUST have exactly these keys:
   - "week": integer (1, 2, 3, …)
   - "theme": string — a short motivating name for this week's phase
   - "topic": string — the main topic/concept for this week
   - "learning_objectives": array of 3 strings — specific, measurable objectives
   - "action_items": array of 4 strings — concrete tasks the student should do
   - "resources": array of 3-5 strings — suggested learning resources (books, websites, videos)
   - "milestone": string — a clear checkpoint to verify progress
4. Make the plan PROGRESSIVE — start with foundations, build to mastery.
5. Tailor everything to the student's specific goal and weak areas.
6. Be specific, not generic. Reference the actual subject matter.
7. Each week should build on the previous one.
"""


def _build_user_prompt(student_goal: str, weak_areas: str, duration_weeks: int, additional_context: Optional[str] = None) -> str:
    """Build the user prompt for study plan generation."""
    prompt = (
        f"Create a {duration_weeks}-week study plan for a student.\n\n"
        f"GOAL: {student_goal}\n"
        f"WEAK AREAS: {weak_areas}\n"
        f"DURATION: {duration_weeks} weeks\n"
    )
    if additional_context:
        prompt += f"ADDITIONAL CONTEXT: {additional_context}\n"
    prompt += (
        f"\nReturn a JSON array with exactly {duration_weeks} weekly objects. "
        f"Each object must have: week, theme, topic, learning_objectives (3), "
        f"action_items (4), resources (3-5), milestone."
    )
    return prompt


def _parse_json_response(response_text: str) -> List[Dict[str, Any]]:
    """
    Parse JSON from LLM response, handling common formatting issues.
    
    LLMs sometimes include markdown code blocks or extra text.
    This function extracts and parses the JSON content.
    """
    text = response_text.strip()
    
    # Remove markdown code blocks if present
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if json_match:
        text = json_match.group(1)
    
    # Find the JSON array boundaries
    start_idx = text.find('[')
    end_idx = text.rfind(']')
    
    if start_idx != -1 and end_idx != -1:
        text = text[start_idx:end_idx + 1]
    
    try:
        parsed = json.loads(text)
        if not isinstance(parsed, list):
            raise ValueError("Response is not a JSON array")
        return parsed
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        logger.debug(f"Raw response: {response_text[:500]}...")
        raise ValueError(f"Failed to parse study plan JSON: {str(e)}")


def _validate_plan_structure(plan: List[Dict[str, Any]], expected_weeks: int) -> List[Dict[str, Any]]:
    """Validate and normalize the AI-generated plan structure."""
    validated = []
    for i, week in enumerate(plan):
        entry = {
            "week": week.get("week", i + 1),
            "theme": week.get("theme", f"Week {i + 1}"),
            "topic": week.get("topic", "Study Session"),
            "learning_objectives": week.get("learning_objectives", [])[:3] or ["Complete weekly study tasks"],
            "action_items": week.get("action_items", [])[:4] or ["Review study materials"],
            "resources": week.get("resources", [])[:5] or ["Online learning platforms"],
            "milestone": week.get("milestone", f"Complete Week {i + 1} objectives"),
        }
        validated.append(entry)
    return validated


# =============================================================================
# LLM BACKEND CALLS (same cascade as Quick Tutor)
# =============================================================================

def _call_groq_for_plan(user_prompt: str) -> Optional[str]:
    """Call Groq API (free) for study plan generation."""
    if not GROQ_API_KEY:
        return None
    
    try:
        response = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": STUDY_PLAN_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 4096,
                "top_p": 0.9,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "").strip()
        return None
    except Exception as e:
        logger.error(f"Groq study plan error: {str(e)}")
        return None


def _call_gemini_for_plan(user_prompt: str) -> Optional[str]:
    """Call Gemini API for study plan generation."""
    if not GEMINI_API_KEY:
        return None
    
    try:
        response = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "system_instruction": {
                    "parts": [{"text": STUDY_PLAN_SYSTEM_PROMPT}],
                },
                "contents": [
                    {"role": "user", "parts": [{"text": user_prompt}]},
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "topP": 0.9,
                    "topK": 40,
                    "maxOutputTokens": 4096,
                },
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "")
        return None
    except Exception as e:
        logger.error(f"Gemini study plan error: {str(e)}")
        return None


def _call_ollama_for_plan(user_prompt: str) -> Optional[str]:
    """Call Ollama (local) for study plan generation."""
    try:
        # Quick check if Ollama is running
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        if r.status_code != 200:
            return None
    except Exception:
        return None
    
    try:
        prompt = f"{STUDY_PLAN_SYSTEM_PROMPT}\n\n{user_prompt}"
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.7, "num_predict": 4096},
            },
            timeout=90,
        )
        response.raise_for_status()
        return response.json().get("response", "").strip()
    except Exception as e:
        logger.error(f"Ollama study plan error: {str(e)}")
        return None


def _generate_ai_study_plan(
    student_goal: str,
    weak_areas: str,
    duration_weeks: int,
    additional_context: Optional[str] = None,
) -> Optional[List[Dict[str, Any]]]:
    """
    Generate a study plan using the best available LLM backend.
    Returns the parsed plan list, or None if all backends fail.
    """
    user_prompt = _build_user_prompt(student_goal, weak_areas, duration_weeks, additional_context)
    
    backends = [
        ("gemini", _call_gemini_for_plan),
        ("groq", _call_groq_for_plan),
        ("ollama", _call_ollama_for_plan),
    ]
    
    for name, call_fn in backends:
        logger.info(f"Study Planner: trying {name}...")
        raw = call_fn(user_prompt)
        if raw:
            try:
                plan = _parse_json_response(raw)
                validated = _validate_plan_structure(plan, duration_weeks)
                logger.info(f"Study Planner: {name} produced {len(validated)}-week plan")
                return validated
            except (ValueError, json.JSONDecodeError) as e:
                logger.warning(f"Study Planner: {name} returned unparseable JSON: {e}")
                continue
    
    logger.warning("Study Planner: all LLM backends failed, falling back to Serper-enhanced template")
    return None


# =============================================================================
# SERPER-POWERED SMART TEMPLATE
# =============================================================================

def _serper_search_topics(query: str, num_results: int = 5) -> Dict:
    """Perform a Serper search and return the raw response data."""
    if not SERPER_API_KEY:
        return {}
    
    import hashlib
    from django.core.cache import cache as django_cache
    
    cache_key = f"serper_sp_{hashlib.md5(query.encode()).hexdigest()}"
    cached = django_cache.get(cache_key)
    if cached:
        return cached
    
    try:
        response = requests.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": num_results, "gl": "us", "hl": "en"},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()
        django_cache.set(cache_key, data, 600)
        return data
    except Exception as e:
        logger.warning(f"Serper topic search error: {str(e)}")
        return {}


def _generate_serper_smart_plan(
    student_goal: str,
    weak_areas: str,
    duration_weeks: int
) -> Optional[List[Dict[str, Any]]]:
    """
    Generate a study plan using Serper searches to discover real topics,
    subtopics, and learning progressions. Much smarter than generic templates.
    """
    if not SERPER_API_KEY:
        return None
    
    logger.info("Study Planner: generating Serper-smart plan...")
    
    # ── Search for topic breakdown / syllabus ──
    syllabus_data = _serper_search_topics(
        f"{weak_areas} study plan syllabus topics order learn", num_results=5
    )
    subtopics_data = _serper_search_topics(
        f"{weak_areas} key concepts subtopics beginners to advanced", num_results=5
    )
    tips_data = _serper_search_topics(
        f"how to study {weak_areas} tips strategies", num_results=3
    )
    
    # ── Extract subtopics from search results ──
    discovered_topics = []
    all_snippets = []
    
    for data in [syllabus_data, subtopics_data]:
        for item in data.get("organic", []):
            snippet = item.get("snippet", "")
            if snippet:
                all_snippets.append(snippet)
                # Extract potential topic names from snippets
                # Look for numbered items, comma-separated lists, etc.
                # Split on common delimiters
                for sep in [", ", "; ", " - ", "• ", "· "]:
                    if sep in snippet:
                        parts = snippet.split(sep)
                        for part in parts:
                            clean = part.strip().rstrip(".")
                            if 3 < len(clean) < 60 and clean not in discovered_topics:
                                discovered_topics.append(clean)
    
    # Extract study tips
    study_tips = []
    for item in tips_data.get("organic", []):
        snippet = item.get("snippet", "")
        if snippet:
            study_tips.append(snippet.split(". ")[0].strip())
    
    # ── Build the plan ──
    phases = ["Foundation", "Core Concepts", "Application", "Practice & Review", "Advanced", "Mastery"]
    
    plan = []
    for week in range(1, duration_weeks + 1):
        phase_idx = min(int((week - 1) / max(1, duration_weeks - 1) * (len(phases) - 1)), len(phases) - 1)
        phase_name = phases[phase_idx]
        
        # Pick a discovered topic for this week if available
        if discovered_topics:
            topic_idx = (week - 1) % len(discovered_topics)
            week_topic = discovered_topics[topic_idx]
        else:
            week_topic = f"{weak_areas} — Week {week}"
        
        # Pick a study tip if available
        tip = study_tips[(week - 1) % len(study_tips)] if study_tips else f"Focus on understanding {week_topic}"
        
        # Use search snippet content for objectives
        snippet_idx = (week - 1) % max(1, len(all_snippets))
        context_snippet = all_snippets[snippet_idx] if all_snippets else ""
        
        week_entry = {
            "week": week,
            "theme": f"{phase_name} — {week_topic[:50]}",
            "topic": week_topic,
            "learning_objectives": [
                f"Understand the key concepts of {week_topic}",
                f"Apply {week_topic} to {student_goal}",
                f"Practice problems related to {week_topic}",
            ],
            "action_items": [
                f"Study: {tip}" if tip else f"Study {week_topic} fundamentals",
                f"Complete practice exercises on {week_topic}",
                f"Create summary notes for {week_topic}",
                f"Review previous weeks and connect to {week_topic}",
            ],
            "resources": [
                f"Search: '{week_topic} tutorial' on YouTube",
                f"Search: '{week_topic} practice problems'",
                f"Khan Academy / Coursera — {weak_areas}",
            ],
            "milestone": f"Can explain and solve problems about {week_topic} with confidence",
        }
        
        plan.append(week_entry)
    
    logger.info(f"Study Planner: Serper-smart plan generated with {len(discovered_topics)} discovered topics")
    return plan


def _generate_mock_study_plan(
    student_goal: str,
    weak_areas: str,
    duration_weeks: int
) -> List[Dict[str, Any]]:
    """
    Generate a contextual mock study plan for fallback scenarios.
    
    Used when:
    - API key is missing
    - API call fails
    - During demos without API access
    
    This generates realistic, contextual content based on the goal and weak areas.
    
    Args:
        student_goal: Student's learning goal
        weak_areas: Areas needing improvement
        duration_weeks: Number of weeks
        
    Returns:
        Mock study plan as a list of weekly entries
    """
    mock_plan = []
    
    # Progressive learning phases
    phases = [
        {
            "name": "Foundation",
            "focus": ["basics", "fundamentals", "core concepts"],
            "activities": ["Read introductory materials", "Watch tutorial videos", "Take notes on key concepts"]
        },
        {
            "name": "Building Blocks",
            "focus": ["core theory", "essential principles", "key formulas"],
            "activities": ["Study detailed explanations", "Work through examples", "Practice basic problems"]
        },
        {
            "name": "Application",
            "focus": ["practical exercises", "real-world problems", "problem-solving"],
            "activities": ["Solve practice problems", "Complete worksheets", "Work on projects"]
        },
        {
            "name": "Integration",
            "focus": ["combining concepts", "complex scenarios", "connections"],
            "activities": ["Tackle challenging problems", "Create synthesis notes", "Review interconnections"]
        },
        {
            "name": "Advanced",
            "focus": ["mastery level", "advanced applications", "edge cases"],
            "activities": ["Solve advanced problems", "Do practice exams", "Explain concepts to others"]
        },
        {
            "name": "Mastery",
            "focus": ["comprehensive review", "assessment prep", "final consolidation"],
            "activities": ["Full review sessions", "Take mock exams", "Identify weak spots"]
        },
    ]
    
    # Create more contextual objectives based on weak areas
    weak_area_keywords = weak_areas.lower().split()
    
    for week in range(1, duration_weeks + 1):
        # Select appropriate phase
        phase_idx = min(int((week - 1) / max(1, duration_weeks - 1) * (len(phases) - 1)), len(phases) - 1)
        phase = phases[phase_idx]
        
        # Create contextual content
        focus_item = phase["focus"][week % len(phase["focus"])]
        activity = phase["activities"][week % len(phase["activities"])]
        
        week_entry = {
            "week": week,
            "theme": f"{phase['name']} Phase (Week {week})",
            "topic": f"Master {focus_item} in {weak_areas}",
            "learning_objectives": [
                f"Deeply understand {focus_item} concepts related to {weak_areas}",
                f"Apply {focus_item} to {student_goal}",
                f"Identify common mistakes in {weak_areas}"
            ],
            "action_items": [
                f"{activity} to understand {weak_areas}",
                f"Complete {week*2} practice problems on {focus_item}",
                f"Create a summary or mind map of key {weak_areas} concepts",
                f"Review and refine understanding of previous week's material"
            ],
            "resources": [
                f"Educational videos on {weak_areas}",
                f"Practice problems database for {weak_areas}",
                f"Study guides and textbooks",
                "Online discussion forums",
                "Peer study groups"
            ],
            "milestone": f"Successfully explain {focus_item} and solve {week*3} related problems with {70 + week * 2}% accuracy"
        }
        
        mock_plan.append(week_entry)
    
    return mock_plan


# =============================================================================
# SERPER INTEGRATION FUNCTION
# =============================================================================

def _enhance_plan_with_serper_resources(
    study_plan: List[Dict[str, Any]],
    weak_areas: str
) -> List[Dict[str, Any]]:
    """
    Enhance study plan by adding real-world resources from Serper searches.
    
    For each week in the plan, searches for relevant learning resources,
    practice problems, and tutorials to supplement the study plan.
    
    Args:
        study_plan: The generated study plan
        weak_areas: The student's weak areas
        
    Returns:
        Enhanced study plan with real resources added
    """
    try:
        logger.info("Enhancing study plan with Serper search results...")
        
        for week_entry in study_plan:
            topic = week_entry.get("topic", "")
            
            if not topic:
                continue
            
            try:
                # Search for learning resources for this week's topic
                search_results = search_for_study_resources(topic, search_type="learning")
                
                # Extract resource links and titles
                if search_results:
                    # Create formatted resource strings
                    for result in search_results[:3]:  # Limit to top 3 resources per week
                        resource_str = f"{result.get('title', 'Resource')} - {result.get('link', '')}"
                        if resource_str not in week_entry.get("resources", []):
                            if "resources" not in week_entry:
                                week_entry["resources"] = []
                            week_entry["resources"].append(resource_str)
                    
                    # Also search for practice problems
                    practice_results = search_for_study_resources(topic, search_type="practice")
                    
                    if practice_results:
                        # Add top practice problem resource
                        practice_resource = f"Practice Problems: {practice_results[0].get('title', '')} - {practice_results[0].get('link', '')}"
                        if practice_resource not in week_entry.get("resources", []):
                            week_entry["resources"].append(practice_resource)
                
                logger.info(f"Enhanced week {week_entry.get('week', '?')} with {len(search_results)} resources")
                
            except Exception as e:
                logger.warning(f"Failed to enhance week {week_entry.get('week', '?')} with resources: {str(e)}")
                # Continue with other weeks even if one fails
                continue
        
        logger.info("Study plan enhancement with Serper completed")
        return study_plan
        
    except Exception as e:
        logger.error(f"Error enhancing plan with Serper: {str(e)}")
        # Return the original plan if enhancement fails
        return study_plan


# =============================================================================
# MAIN API FUNCTION
# =============================================================================

def generate_study_plan(
    student_goal: str,
    weak_areas: str,
    duration_weeks: int = 4,
    additional_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a personalized study plan using AI + Serper resource discovery.
    
    This is the main entry point for the study planner feature.
    
    WORKFLOW:
    1. Validate inputs
    2. Try AI-generated plan (Gemini → Groq → Ollama)
    3. Fall back to template plan if all AI backends fail
    4. Enhance with Serper search results for real resource URLs
    5. Return enriched plan with actual learning materials
    
    Args:
        student_goal: What the student wants to achieve (e.g., "Pass Calculus Exam")
        weak_areas: Areas needing improvement (e.g., "Integrals and Derivatives")
        duration_weeks: Number of weeks for the plan (default: 4, max: 12)
        additional_context: Optional extra information
        
    Returns:
        Dictionary containing:
        - status: 'success' or 'error'
        - plan: List of weekly entries with resources
        - metadata: Generation details
        
    Example:
        >>> result = generate_study_plan(
        ...     student_goal="Master Calculus for Final Exam",
        ...     weak_areas="Integration and Chain Rule",
        ...     duration_weeks=4
        ... )
        >>> print(result['plan'][0]['topic'])
    """
    # Validate inputs
    if not student_goal or not student_goal.strip():
        return {
            'status': 'error',
            'message': 'Student goal is required',
            'plan': []
        }
    
    if not weak_areas or not weak_areas.strip():
        return {
            'status': 'error',
            'message': 'Weak areas specification is required',
            'plan': []
        }
    
    # Clamp duration to reasonable bounds
    duration_weeks = max(1, min(12, int(duration_weeks)))
    
    # Track generation metadata
    metadata = {
        'generated_at': datetime.now().isoformat(),
        'duration_weeks': duration_weeks,
        'input': {
            'goal': student_goal,
            'weak_areas': weak_areas
        }
    }
    
    try:
        logger.info(f"Generating {duration_weeks}-week study plan for: {student_goal}")
        
        # ── Step 1: Try AI-generated plan (Gemini → Groq → Ollama) ──
        study_plan = _generate_ai_study_plan(
            student_goal=student_goal,
            weak_areas=weak_areas,
            duration_weeks=duration_weeks,
            additional_context=additional_context,
        )
        
        ai_method = "ai_generated"
        
        # ── Step 2: Try Serper-smart plan (uses web search to discover topics) ──
        if not study_plan:
            logger.info("Trying Serper-smart plan generation...")
            study_plan = _generate_serper_smart_plan(
                student_goal=student_goal,
                weak_areas=weak_areas,
                duration_weeks=duration_weeks
            )
            if study_plan:
                ai_method = "serper_smart"
        
        # ── Step 3: Fallback to generic template ──
        if not study_plan:
            logger.info("Falling back to template-based plan generation")
            study_plan = _generate_mock_study_plan(
                student_goal=student_goal,
                weak_areas=weak_areas,
                duration_weeks=duration_weeks
            )
            ai_method = "template_fallback"
        
        # Validate the plan structure
        if not study_plan or len(study_plan) == 0:
            raise ValueError("Failed to generate study plan")
        
        # ── Step 3: Enhance with Serper search resources ──
        logger.info("Adding Serper search resources to study plan...")
        study_plan = _enhance_plan_with_serper_resources(study_plan, weak_areas)
        
        logger.info(f"Successfully generated {len(study_plan)}-week plan via {ai_method}")
        
        return {
            'status': 'success',
            'message': f'Study plan generated successfully via {ai_method}',
            'plan': study_plan,
            'metadata': {**metadata, 'method': ai_method, 'weeks_generated': len(study_plan)}
        }
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return {
            'status': 'error',
            'message': str(e),
            'plan': [],
            'metadata': {**metadata, 'method': 'error', 'error': str(e)}
        }
        
    except Exception as e:
        logger.error(f"Study plan generation error: {str(e)}")
        return {
            'status': 'error',
            'message': f'Failed to generate study plan: {str(e)}',
            'plan': [],
            'metadata': {**metadata, 'method': 'error', 'error': str(e)}
        }


def get_quick_tips(topic: str, count: int = 5) -> Dict[str, Any]:
    """
    Generate quick study tips for a specific topic.
    
    Returns helpful study tips using Serper search for curated resources.
    
    Args:
        topic: The topic to get tips for
        count: Number of tips to generate (default: 5)
        
    Returns:
        Dictionary with tips list
    """
    try:
        # Search for study tips and best practices
        search_results = search_for_study_resources(topic, search_type="learning")
        
        tips = []
        
        # Extract tips from search results
        for result in search_results[:count]:
            tips.append(f"{result.get('title', 'Study Tip')} - {result.get('link', '')}")
        
        # Add generic tips if not enough found
        if len(tips) < count:
            generic_tips = [
                f"Focus on understanding core concepts of {topic}",
                "Practice with progressively harder problems",
                "Seek help when stuck for more than 15 minutes",
                f"Create a summary or mind map of {topic}",
                "Review previous material regularly"
            ]
            
            for tip in generic_tips:
                if len(tips) < count:
                    tips.append(tip)
        
        return {
            'status': 'success',
            'topic': topic,
            'service': 'serper',
            'tips': tips[:count]
        }
        
    except Exception as e:
        logger.error(f"Error generating tips: {str(e)}")
        return {
            'status': 'fallback',
            'topic': topic,
            'error': str(e),
            'tips': [
                f"Focus on understanding core concepts of {topic}",
                "Practice with progressively harder problems",
                "Seek help when stuck for more than 15 minutes",
                f"Create a summary or mind map of {topic}",
                "Review previous material regularly"
            ]
        }


def estimate_study_time(
    topic: str,
    skill_level: str = "beginner",
    goal: str = "proficiency"
) -> Dict[str, Any]:
    """
    Estimate time needed to learn a topic.
    
    Args:
        topic: The subject/topic to learn
        skill_level: Current level (beginner, intermediate, advanced)
        goal: Target level (familiarity, proficiency, mastery)
        
    Returns:
        Time estimation with breakdown
    """
    # Simple rule-based estimation (could be enhanced with AI)
    base_hours = {
        'beginner': {'familiarity': 10, 'proficiency': 40, 'mastery': 100},
        'intermediate': {'familiarity': 5, 'proficiency': 20, 'mastery': 60},
        'advanced': {'familiarity': 2, 'proficiency': 10, 'mastery': 30}
    }
    
    hours = base_hours.get(skill_level, base_hours['beginner']).get(goal, 40)
    
    return {
        'topic': topic,
        'current_level': skill_level,
        'target_level': goal,
        'estimated_hours': hours,
        'suggested_schedule': {
            'intensive': f"{hours // 5} days (5 hours/day)",
            'moderate': f"{hours // 10} weeks (10 hours/week)",
            'relaxed': f"{hours // 5} weeks (5 hours/week)"
        },
        'recommendation': f"For {goal} in {topic}, plan for approximately {hours} hours of focused study."
    }
