"""
=============================================================================
Find My Tutor (FMT) - AI Study Planner Module
=============================================================================

This module implements an AI-powered Study Planner using multiple LLM services.
It generates personalized, week-by-week study plans based on student goals.

GENERATIVE AI OVERVIEW:
-----------------------
Service Priority:
1. Google Gemini API (primary - powerful & reliable)
2. Ollama (local, completely free)
3. Hugging Face (free tier)
4. Mock fallback (template plans)

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
Date: January 2026
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
# SERPER AI CONFIGURATION (Primary Service)
# =============================================================================

SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")


def _initialize_ai_client():
    """
    Initialize the AI client for Serper service.
    
    Returns:
        Dictionary with Serper service info
        
    Raises:
        ValueError if SERPER_API_KEY is not configured
    """
    if not SERPER_API_KEY:
        raise ValueError(
            "SERPER_API_KEY is not configured. "
            "Please add your Serper API key to the .env file. "
            "Get a free key at: https://serper.dev"
        )
    
    logger.info("Using Serper AI for study resource gathering")
    return {"service": "serper", "api_key": SERPER_API_KEY}

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
    Generate a personalized study plan using Serper AI for resource discovery.
    
    This is the main entry point for the study planner feature.
    Uses Serper to search for real learning resources and enhances 
    a structured study plan with actual URLs and materials.
    
    WORKFLOW:
    1. Validate inputs
    2. Generate base study plan (structured template)
    3. Enhance with Serper search results for real resources
    4. Return enriched plan with actual learning materials
    
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
        
        # Generate base study plan (structured template)
        study_plan = _generate_mock_study_plan(
            student_goal=student_goal,
            weak_areas=weak_areas,
            duration_weeks=duration_weeks
        )
        
        # Validate the plan structure
        if not study_plan or len(study_plan) == 0:
            raise ValueError("Failed to generate study plan")
        
        # Enhance plan with Serper search resources
        logger.info("Adding Serper search resources to study plan...")
        study_plan = _enhance_plan_with_serper_resources(study_plan, weak_areas)
        
        logger.info(f"Successfully generated {len(study_plan)}-week study plan with Serper resources")
        
        return {
            'status': 'success',
            'message': 'Study plan generated successfully with Serper AI resource discovery',
            'plan': study_plan,
            'metadata': {**metadata, 'method': 'serper_enhanced', 'weeks_generated': len(study_plan)}
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
