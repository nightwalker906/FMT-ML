"""
=============================================================================
Find My Tutor (FMT) - AI Study Planner Module (Generative AI)
=============================================================================

This module implements an AI-powered Study Planner using Google's Gemini API.
It generates personalized, week-by-week study plans based on student goals.

GENERATIVE AI OVERVIEW:
-----------------------
Google Gemini is a Large Language Model (LLM) that can:
1. Understand natural language queries
2. Generate human-like text responses
3. Follow complex instructions (prompt engineering)
4. Output structured data (JSON format)

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

WHY GEMINI:
- Free tier available for development
- Strong instruction-following capabilities
- Good at structured output (JSON)
- Fast inference for real-time applications

Author: FMT Development Team
Date: December 2024
=============================================================================
"""

import os
import json
import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# =============================================================================
# GEMINI API CONFIGURATION
# =============================================================================

# API Key loaded from environment variable for security
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Model configuration - Updated to use Gemini 1.5 Flash (faster, free tier friendly)
GEMINI_MODEL = "gemini-pro"

# Generation settings
GENERATION_CONFIG = {
    "temperature": 0.7,      # Creativity level (0=deterministic, 1=creative)
    "top_p": 0.9,            # Nucleus sampling parameter
    "top_k": 40,             # Top-k sampling parameter
    "max_output_tokens": 2048,  # Maximum response length
}

# Safety settings (allow educational content)
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]


def _initialize_gemini():
    """
    Initialize the Gemini API client.
    
    Returns:
        Configured GenerativeModel instance or None if initialization fails
    """
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY not found in environment variables")
        return None
    
    try:
        import google.generativeai as genai
        
        # Configure the API with our key
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Initialize the model
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            generation_config=GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS
        )
        
        logger.info(f"Gemini API initialized successfully with model: {GEMINI_MODEL}")
        return model
        
    except ImportError:
        logger.error("google-generativeai package not installed")
        return None
    except Exception as e:
        logger.error(f"Failed to initialize Gemini API: {str(e)}")
        return None


def _build_study_plan_prompt(
    student_goal: str,
    weak_areas: str,
    duration_weeks: int,
    additional_context: Optional[str] = None
) -> str:
    """
    Construct an optimized prompt for study plan generation.
    
    PROMPT ENGINEERING TECHNIQUES USED:
    1. Role-based instruction (Senior Academic Advisor)
    2. Clear task definition
    3. Structured output format (JSON schema)
    4. Constraints and boundaries
    5. Example format for clarity
    
    Args:
        student_goal: What the student wants to achieve
        weak_areas: Areas where the student needs improvement
        duration_weeks: Number of weeks for the study plan
        additional_context: Any extra information about the student
        
    Returns:
        Formatted prompt string
    """
    prompt = f"""You are a Senior Academic Advisor with 20 years of experience helping students achieve their academic goals. Your task is to create a personalized, week-by-week study plan.

## STUDENT INFORMATION:
- **Primary Goal:** {student_goal}
- **Weak Areas/Challenges:** {weak_areas}
- **Available Time:** {duration_weeks} weeks
{f"- **Additional Context:** {additional_context}" if additional_context else ""}

## YOUR TASK:
Create a detailed {duration_weeks}-week study plan that:
1. Progressively builds from fundamentals to advanced concepts
2. Focuses specifically on addressing the weak areas mentioned
3. Includes practical exercises and actionable tasks
4. Is realistic and achievable within the timeframe

## OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON array. No additional text before or after.
Each week should follow this exact structure:

```json
[
  {{
    "week": 1,
    "theme": "Foundation Building",
    "topic": "Core concept to focus on this week",
    "learning_objectives": [
      "Objective 1",
      "Objective 2"
    ],
    "action_items": [
      "Specific task 1",
      "Specific task 2",
      "Specific task 3"
    ],
    "resources": [
      "Recommended resource or practice type"
    ],
    "milestone": "What student should achieve by end of week"
  }}
]
```

## IMPORTANT RULES:
1. Generate EXACTLY {duration_weeks} week entries
2. Each week must have 2-4 action items that are specific and actionable
3. Topics should progress logically from basic to advanced
4. Include variety: reading, practice problems, review sessions
5. The final week should include revision and assessment preparation

Generate the study plan now:"""
    
    return prompt


def _parse_json_response(response_text: str) -> List[Dict[str, Any]]:
    """
    Parse JSON from LLM response, handling common formatting issues.
    
    LLMs sometimes include markdown code blocks or extra text.
    This function extracts and parses the JSON content.
    
    Args:
        response_text: Raw text response from the LLM
        
    Returns:
        Parsed JSON as a list of dictionaries
        
    Raises:
        ValueError: If JSON parsing fails
    """
    # Remove markdown code blocks if present
    text = response_text.strip()
    
    # Try to extract JSON from code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if json_match:
        text = json_match.group(1)
    
    # Find the JSON array boundaries
    start_idx = text.find('[')
    end_idx = text.rfind(']')
    
    if start_idx != -1 and end_idx != -1:
        text = text[start_idx:end_idx + 1]
    
    # Parse the JSON
    try:
        parsed = json.loads(text)
        
        # Validate structure
        if not isinstance(parsed, list):
            raise ValueError("Response is not a JSON array")
        
        return parsed
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        logger.debug(f"Raw response: {response_text[:500]}...")
        raise ValueError(f"Failed to parse study plan JSON: {str(e)}")


def _generate_mock_study_plan(
    student_goal: str,
    weak_areas: str,
    duration_weeks: int
) -> List[Dict[str, Any]]:
    """
    Generate a mock study plan for fallback scenarios.
    
    Used when:
    - API key is missing
    - API call fails
    - During demos without API access
    
    Args:
        student_goal: Student's learning goal
        weak_areas: Areas needing improvement
        duration_weeks: Number of weeks
        
    Returns:
        Mock study plan as a list of weekly entries
    """
    mock_plan = []
    
    # Generate progressive weekly plans
    phases = [
        ("Foundation", "basics", "fundamentals"),
        ("Building Blocks", "core concepts", "principles"),
        ("Application", "practice problems", "exercises"),
        ("Integration", "combining concepts", "connections"),
        ("Advanced", "complex problems", "challenges"),
        ("Mastery", "review", "assessment prep"),
    ]
    
    for week in range(1, duration_weeks + 1):
        # Determine phase based on week progression
        phase_idx = min(int((week - 1) / duration_weeks * len(phases)), len(phases) - 1)
        phase_name, focus1, focus2 = phases[phase_idx]
        
        week_entry = {
            "week": week,
            "theme": f"{phase_name} Phase",
            "topic": f"Week {week}: Focus on {weak_areas} - {focus1}",
            "learning_objectives": [
                f"Understand {focus1} of {weak_areas}",
                f"Apply {focus2} to solve problems"
            ],
            "action_items": [
                f"Review {focus1} related to {student_goal}",
                f"Complete practice exercises on {weak_areas}",
                f"Work through example problems",
                "Self-assessment quiz"
            ],
            "resources": [
                "Textbook chapters",
                "Online practice problems",
                "Video tutorials"
            ],
            "milestone": f"Complete {focus1} assessment with 70%+ accuracy"
        }
        
        mock_plan.append(week_entry)
    
    return mock_plan


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
    Generate a personalized AI-powered study plan.
    
    This is the main entry point for the study planner feature.
    Uses Google Gemini to create customized weekly study plans.
    
    WORKFLOW:
    1. Validate inputs
    2. Initialize Gemini API
    3. Build optimized prompt
    4. Call LLM API
    5. Parse JSON response
    6. Return structured plan
    
    Falls back to mock plan if API fails.
    
    Args:
        student_goal: What the student wants to achieve (e.g., "Pass Calculus Exam")
        weak_areas: Areas needing improvement (e.g., "Integrals and Derivatives")
        duration_weeks: Number of weeks for the plan (default: 4, max: 12)
        additional_context: Optional extra information
        
    Returns:
        Dictionary containing:
        - status: 'success' or 'fallback'
        - plan: List of weekly entries
        - metadata: Generation details
        
    Example:
        >>> result = generate_study_plan(
        ...     student_goal="Master Calculus for Final Exam",
        ...     weak_areas="Integration and Chain Rule",
        ...     duration_weeks=4
        ... )
        >>> print(result['plan'][0]['topic'])
        "Week 1: Foundation - Understanding Integration Basics"
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
        'model': GEMINI_MODEL,
        'duration_weeks': duration_weeks,
        'input': {
            'goal': student_goal,
            'weak_areas': weak_areas
        }
    }
    
    # Attempt to use Gemini API
    try:
        # Initialize API
        model = _initialize_gemini()
        
        if model is None:
            logger.warning("Gemini API not available, using mock plan")
            mock_plan = _generate_mock_study_plan(
                student_goal, weak_areas, duration_weeks
            )
            return {
                'status': 'fallback',
                'message': 'AI service unavailable. Generated template plan.',
                'plan': mock_plan,
                'metadata': {**metadata, 'method': 'mock_fallback'}
            }
        
        # Build prompt
        prompt = _build_study_plan_prompt(
            student_goal=student_goal,
            weak_areas=weak_areas,
            duration_weeks=duration_weeks,
            additional_context=additional_context
        )
        
        logger.info(f"Generating {duration_weeks}-week study plan for: {student_goal}")
        
        # Call Gemini API
        response = model.generate_content(prompt)
        
        # Check for valid response
        if not response or not response.text:
            raise ValueError("Empty response from Gemini API")
        
        # Parse the JSON response
        study_plan = _parse_json_response(response.text)
        
        # Validate the plan structure
        if not study_plan or len(study_plan) == 0:
            raise ValueError("Generated plan is empty")
        
        logger.info(f"Successfully generated {len(study_plan)}-week study plan")
        
        return {
            'status': 'success',
            'message': 'Study plan generated successfully',
            'plan': study_plan,
            'metadata': {**metadata, 'method': 'gemini_ai', 'weeks_generated': len(study_plan)}
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        mock_plan = _generate_mock_study_plan(student_goal, weak_areas, duration_weeks)
        return {
            'status': 'fallback',
            'message': f'AI response parsing failed. Generated template plan.',
            'plan': mock_plan,
            'metadata': {**metadata, 'method': 'mock_fallback', 'error': str(e)}
        }
        
    except Exception as e:
        logger.error(f"Study plan generation error: {str(e)}")
        mock_plan = _generate_mock_study_plan(student_goal, weak_areas, duration_weeks)
        return {
            'status': 'fallback',
            'message': f'AI service error. Generated template plan.',
            'plan': mock_plan,
            'metadata': {**metadata, 'method': 'mock_fallback', 'error': str(e)}
        }


def get_quick_tips(topic: str, count: int = 5) -> Dict[str, Any]:
    """
    Generate quick study tips for a specific topic.
    
    A lighter-weight API call for generating study advice.
    
    Args:
        topic: The topic to get tips for
        count: Number of tips to generate (default: 5)
        
    Returns:
        Dictionary with tips list
    """
    prompt = f"""Generate {count} practical, actionable study tips for learning {topic}.

Return ONLY a JSON array of strings, like this:
["Tip 1", "Tip 2", "Tip 3"]

Be specific and helpful. Each tip should be 1-2 sentences."""

    model_names = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
    last_error = None
    for model_name in model_names:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=GENERATION_CONFIG,
                safety_settings=SAFETY_SETTINGS
            )
            logger.info(f"Gemini API initialized successfully with model: {model_name}")
            response = model.generate_content(prompt)
            tips = _parse_json_response(response.text)
            return {
                'status': 'success',
                'topic': topic,
                'model': model_name,
                'tips': tips[:count]
            }
        except Exception as e:
            logger.error(f"Gemini model {model_name} failed: {str(e)}")
            last_error = str(e)

    # If all models fail, return fallback tips
    return {
        'status': 'error',
        'topic': topic,
        'error': last_error or 'All Gemini models failed',
        'tips': [
            f"Focus on understanding core concepts of {topic}",
            "Practice with progressively harder problems",
            "Seek help when stuck for more than 15 minutes"
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
