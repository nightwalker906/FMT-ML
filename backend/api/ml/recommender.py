"""
=============================================================================
HIGH-PERFORMANCE RECOMMENDATION ENGINE - Singleton Pattern
=============================================================================

Purpose:
  Fast tutor recommendations using pre-trained TF-IDF vectors and hybrid scoring.
  Loads artifacts at startup (singleton) for instant API responses.

Architecture:
  1. Singleton Loader: Load vectorizer, matrix, tutor_ids at module import
  2. Query Vectorization: Transform student query using cached vectorizer
  3. Cosine Similarity: Calculate match scores against all tutors
  4. Hybrid Scoring: Combine text similarity + rating + price fit
  5. Ranking: Return top N tutors sorted by final score

Performance Characteristics:
  - Load time: ~100ms (first import)
  - Per-request time: ~50-100ms for 1000 tutors
  - Memory footprint: ~15-20 MB (vectorizer + matrix)
  - Scalability: Supports 5000+ tutors without optimization

Hybrid Scoring Formula:
  ┌─────────────────────────────────────────────────────────────┐
  │ FINAL_SCORE = (SIMILARITY × 0.30) +                        │
  │               (RATING_SCORE × 0.40) +                      │
  │               (PRICE_FIT_SCORE × 0.30)                     │
  │                                                              │
  │ Where:                                                       │
  │   SIMILARITY         = Cosine similarity (0-1)              │
  │   RATING_SCORE      = (avg_rating / 5.0) × 100            │
  │   PRICE_FIT_SCORE   = Max(0, 1 - (rate / 100)) × 100      │
  │                                                              │
  │ Notes:                                                       │
  │   - Similarity weight reduced (30%) because TF-IDF          │
  │     naturally produces sparse vectors with low max values   │
  │   - Rating weight increased (40%) as most discriminating    │
  │   - Price weight increased (30%) for affordability factor   │
  └─────────────────────────────────────────────────────────────┘

Author: FMT ML Engineering Team
Date: February 2026
=============================================================================
"""

import os
import sys
import json
import logging
import traceback
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Data science
import numpy as np
import pandas as pd
import joblib

# Django - Only setup if not already configured
import django
try:
    from django.apps import apps
    if not apps.ready:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
        django.setup()
except RuntimeError:
    # Django already set up
    pass

from core.models import Student, Profile

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

# Paths to trained models
MODELS_DIR = Path(__file__).parent.parent.parent / 'saved_models'
VECTORIZER_PATH = MODELS_DIR / 'tfidf_vectorizer.pkl'
MATRIX_PATH = MODELS_DIR / 'tfidf_matrix.pkl'
TUTOR_IDS_PATH = MODELS_DIR / 'tutor_ids.pkl'

# Hybrid weighting parameters
SIMILARITY_WEIGHT = 0.30      # Text similarity (TF-IDF cosine) - reduced because naturally sparse
RATING_WEIGHT = 0.40          # Average rating (0-5 stars) - increased, most discriminating
PRICE_WEIGHT = 0.30           # Hourly rate fit (lower is better) - increased

# ═════════════════════════════════════════════════════════════════════════════
# SINGLETON LOADER - Load artifacts once at module import
# ═════════════════════════════════════════════════════════════════════════════


class RecommenderSingleton:
    """
    Singleton class to load and cache the pre-trained recommendation artifacts.
    
    Loads the TF-IDF vectorizer, sparse matrix, and tutor metadata once at
    module import and caches them in memory for fast recommendation generation.
    """
    
    _instance = None
    
    def __init__(self):
        self.vectorizer = None
        self.tfidf_matrix = None
        self.tutor_ids = None
        self.tutor_data = None
        self.is_loaded = False
        self.error_message = None
        
        self._load_artifacts()
    
    def _load_artifacts(self) -> None:
        """Load all pre-trained artifacts from disk."""
        logger.info("[Recommender] Loading recommendation artifacts from disk...")
        
        try:
            # Check if all files exist
            if not all([
                VECTORIZER_PATH.exists(),
                MATRIX_PATH.exists(),
                TUTOR_IDS_PATH.exists()
            ]):
                self.error_message = "Model files not found. Run train_model.py first."
                logger.warning(f"⚠️ {self.error_message}")
                return
            
            # Load vectorizer
            self.vectorizer = joblib.load(VECTORIZER_PATH)
            logger.info(f"   ✅ Vectorizer loaded ({len(self.vectorizer.vocabulary_)} terms)")
            
            # Load TF-IDF matrix
            self.tfidf_matrix = joblib.load(MATRIX_PATH)
            logger.info(f"   ✅ TF-IDF matrix loaded {self.tfidf_matrix.shape}")
            
            # Load tutor IDs
            self.tutor_ids = joblib.load(TUTOR_IDS_PATH)
            logger.info(f"   ✅ Tutor IDs loaded ({len(self.tutor_ids)} tutors)")
            
            # Load tutor data
            self._load_tutor_data()
            
            self.is_loaded = True
            logger.info("✅ Recommender ready!")
        
        except Exception as e:
            self.error_message = str(e)
            logger.error(f"❌ Failed to load artifacts: {e}")
            traceback.print_exc()
    
    def _load_tutor_data(self) -> None:
        """Load tutor metadata from database."""
        logger.info("[Recommender] Loading tutor metadata from database...")
        
        try:
            from core.models import Tutor
            
            tutors = Tutor.objects.select_related('profile').all()
            
            self.tutor_data = {}
            for tutor in tutors:
                profile = tutor.profile
                self.tutor_data[str(profile.id)] = {
                    'first_name': profile.first_name,
                    'last_name': profile.last_name,
                    'avatar': profile.avatar,
                    'hourly_rate': float(tutor.hourly_rate) if tutor.hourly_rate else 0.0,
                    'average_rating': float(tutor.average_rating) if tutor.average_rating else 0.0,
                    'bio_text': tutor.bio_text or '',
                    'qualifications': tutor.qualifications if isinstance(tutor.qualifications, list) else [],
                }
            
            logger.info(f"   ✅ Loaded metadata for {len(self.tutor_data)} tutors")
        
        except Exception as e:
            logger.warning(f"⚠️ Failed to load tutor metadata: {e}")
            self.tutor_data = {}
    
    @classmethod
    def get_instance(cls) -> 'RecommenderSingleton':
        """Get the singleton instance."""
        if cls._instance is None:
            cls._instance = RecommenderSingleton()
        return cls._instance


# Create the singleton at module import
_recommender = RecommenderSingleton.get_instance()


# ═════════════════════════════════════════════════════════════════════════════
# DATABASE HELPERS
# ═════════════════════════════════════════════════════════════════════════════


def fetch_student_learning_goals(student_id: str) -> str:
    """
    Fetch a student's learning goals as a text query.
    
    Args:
        student_id: UUID of the student
        
    Returns:
        Learning goals as a single text string
    """
    try:
        student = Student.objects.filter(profile_id=student_id).first()
        
        if not student:
            logger.warning(f"Student not found: {student_id}")
            return ""
        
        # Parse learning_goals
        learning_goals = student.learning_goals or []
        if isinstance(learning_goals, str):
            try:
                learning_goals = json.loads(learning_goals)
            except:
                learning_goals = []
        
        # Convert goals to a single text string
        learning_goals_text = ' '.join([str(g).lower() for g in learning_goals]) if learning_goals else ""
        return learning_goals_text
    
    except Exception as e:
        logger.error(f"Error fetching student learning goals: {e}")
        return ""


# ═════════════════════════════════════════════════════════════════════════════
# RECOMMENDATION ALGORITHM
# ═════════════════════════════════════════════════════════════════════════════


def calculate_similarity_scores(query: str) -> np.ndarray:
    """
    Calculate cosine similarity scores between a query and all tutors.
    
    Uses pre-trained TF-IDF vectorizer to transform the query into
    a vector, then calculates cosine similarity against the cached matrix.
    
    Args:
        query: Student's search query
        
    Returns:
        NumPy array of similarity scores [0, 1]
    """
    if not query or not query.strip():
        logger.warning("Empty query provided")
        return np.zeros(len(_recommender.tutor_ids))
    
    try:
        from sklearn.metrics.pairwise import cosine_similarity
        
        # Vectorize query
        query_vector = _recommender.vectorizer.transform([query])
        
        # Calculate cosine similarity
        similarities = cosine_similarity(query_vector, _recommender.tfidf_matrix)
        
        # Flatten
        scores = similarities.flatten()
        
        return scores
    
    except Exception as e:
        logger.error(f"Error calculating similarity scores: {e}")
        return np.zeros(len(_recommender.tutor_ids))


def calculate_rating_scores() -> np.ndarray:
    """
    Calculate normalized rating scores for all tutors.
    
    Ratings are on 0-5 scale, normalized to 0-100.
    
    Returns:
        NumPy array of rating scores [0, 100]
    """
    rating_scores = []
    
    for tutor_id in _recommender.tutor_ids:
        tutor_info = _recommender.tutor_data.get(tutor_id, {})
        rating = tutor_info.get('average_rating', 0.0)
        score = (rating / 5.0) * 100.0
        rating_scores.append(score)
    
    return np.array(rating_scores)


def calculate_price_fit_scores() -> np.ndarray:
    """
    Calculate price fit scores for all tutors.
    
    Students prefer lower prices. Formula:
    score = max(0, 1 - (rate / 100)) × 100
    
    Returns:
        NumPy array of price fit scores [0, 100]
    """
    price_scores = []
    
    for tutor_id in _recommender.tutor_ids:
        tutor_info = _recommender.tutor_data.get(tutor_id, {})
        hourly_rate = tutor_info.get('hourly_rate', 0.0)
        score = max(0, (1.0 - (hourly_rate / 100.0))) * 100.0
        price_scores.append(score)
    
    return np.array(price_scores)


def calculate_learning_goal_match(
    learning_goals: str,
    tutor_qualifications: List[str]
) -> float:
    """
    Calculate how well tutor's qualifications match the student's learning goals.
    
    Args:
        learning_goals: Student's learning goals as text (e.g., "computer science tutor")
        tutor_qualifications: List of subjects tutor teaches
        
    Returns:
        Match score 0-1 (1.0 = perfect match, 0 = no match)
    """
    if not learning_goals or not tutor_qualifications:
        return 0.0
    
    # Normalize to lowercase for comparison
    goals_lower = learning_goals.lower()
    quals_lower = [q.lower().strip() for q in tutor_qualifications]
    
    # Check for direct keyword matches in goals
    matches = 0
    for qual in quals_lower:
        # Check if qualification appears in learning goals
        if qual in goals_lower or goals_lower in qual:
            matches += 1
    
    if not matches:
        return 0.0
    
    # Score based on number of matches
    match_score = min(matches / max(len(quals_lower), 1), 1.0)
    return float(np.clip(match_score, 0, 1))


def calculate_enhanced_hybrid_scores(
    similarity_scores: np.ndarray,
    rating_scores: np.ndarray,
    price_fit_scores: np.ndarray,
    learning_goals: str
) -> np.ndarray:
    """
    Calculate hybrid scores with qualification matching boost.
    
    Args:
        similarity_scores: TF-IDF cosine similarity (0-1)
        rating_scores: Rating scores (0-100)
        price_fit_scores: Price fit scores (0-100)
        learning_goals: Student's learning goals text
        
    Returns:
        Enhanced hybrid scores (0-100)
    """
    # Calculate qualification match boost for each tutor
    qual_boosts = []
    for tutor_id in _recommender.tutor_ids:
        tutor_info = _recommender.tutor_data.get(tutor_id, {})
        match_score = calculate_learning_goal_match(
            learning_goals,
            tutor_info.get('qualifications', [])
        )
        qual_boosts.append(match_score * 100)  # Scale to 0-100
    
    qual_boosts = np.array(qual_boosts)
    
    # Normalize similarity to 0-100
    similarity_normalized = similarity_scores * 100.0
    
    # Enhanced weighting with qualification matching as a strong factor
    hybrid_scores = (
        (similarity_normalized * SIMILARITY_WEIGHT) +
        (rating_scores * RATING_WEIGHT) +
        (price_fit_scores * PRICE_WEIGHT) +
        (qual_boosts * 0.25)  # 25% bonus for matching qualifications
    )
    
    # Clip to 0-100
    return np.clip(hybrid_scores, 0, 100)


def calculate_hybrid_scores(
    similarity_scores: np.ndarray,
    rating_scores: np.ndarray,
    price_fit_scores: np.ndarray
) -> np.ndarray:
    """
    Combine scores into final hybrid recommendation score.
    
    Formula:
      final_score = (similarity × 0.30) +
                    (rating × 0.40) +
                    (price_fit × 0.30)
    
    Args:
        similarity_scores: Cosine similarity scores (0-1)
        rating_scores: Normalized rating scores (0-100)
        price_fit_scores: Price fit scores (0-100)
        
    Returns:
        NumPy array of final hybrid scores (0-100)
    """
    # Normalize similarity to 0-100
    similarity_normalized = similarity_scores * 100.0
    
    # Calculate weighted combination
    hybrid_scores = (
        (similarity_normalized * SIMILARITY_WEIGHT) +
        (rating_scores * RATING_WEIGHT) +
        (price_fit_scores * PRICE_WEIGHT)
    )
    
    return hybrid_scores


# ═════════════════════════════════════════════════════════════════════════════
# MAIN API FUNCTION
# ═════════════════════════════════════════════════════════════════════════════


def get_recommendations(
    student_id: Optional[str] = None,
    custom_query: Optional[str] = None,
    top_n: int = 10
) -> List[Dict[str, Any]]:
    """
    Get personalized tutor recommendations for a student.
    
    Main entry point for recommendation requests. Fetches student preferences,
    calculates hybrid scores, and returns top N matches.
    
    Args:
        student_id: UUID of the student (fetches goals from DB)
        custom_query: Manual search query (overrides student_id)
        top_n: Number of recommendations to return
        
    Returns:
        List of recommendation dicts with fields:
          - tutor_id, first_name, last_name, avatar
          - hourly_rate, average_rating
          - match_percentage, similarity_score
          - match_reasons
    """
    # Validate
    if not _recommender.is_loaded:
        error_msg = _recommender.error_message or "Recommender not initialized"
        logger.error(f"❌ Cannot provide recommendations: {error_msg}")
        return []
    
    # Determine query
    if student_id:
        logger.info(f"[Recommender] Generating recommendations for student: {student_id}")
        query = fetch_student_learning_goals(student_id)
    elif custom_query:
        query = custom_query
    else:
        logger.error("Either student_id or custom_query must be provided")
        return []
    
    if not query.strip():
        logger.warning("No search query available")
        return []
    
    try:
        # Calculate all scores
        similarity_scores = calculate_similarity_scores(query)
        rating_scores = calculate_rating_scores()
        price_fit_scores = calculate_price_fit_scores()
        
        # Combine into enhanced hybrid scores with qualification matching
        hybrid_scores = calculate_enhanced_hybrid_scores(
            similarity_scores,
            rating_scores,
            price_fit_scores,
            query  # Pass learning goals for qualification matching
        )
        
        # Get top N
        top_indices = np.argsort(hybrid_scores)[::-1][:top_n]
        
        # Build response
        recommendations = []
        for rank, idx in enumerate(top_indices, 1):
            tutor_id = _recommender.tutor_ids[idx]
            tutor_info = _recommender.tutor_data.get(tutor_id, {})
            
            if not tutor_info:
                continue
            
            # Build explanations - use bio text as primary explanation
            bio_summary = tutor_info.get('bio_text', '')[:200].strip()
            match_reasons = []
            
            if bio_summary:
                match_reasons.append(f"Bio: {bio_summary}")
            
            # Add qualifications if available
            qualifications = tutor_info.get('qualifications', [])
            if qualifications:
                match_reasons.append(f"Expertise: {', '.join(qualifications[:3])}")
            
            if rating_scores[idx] > 80:
                match_reasons.append(f"Rating: {tutor_info['average_rating']:.1f}/5.0")
            if price_fit_scores[idx] > 50:
                match_reasons.append(f"Price: ${tutor_info['hourly_rate']:.0f}/hr")
            
            recommendation = {
                'rank': rank,
                'id': tutor_id,
                'tutor_id': tutor_id,
                'first_name': tutor_info['first_name'],
                'last_name': tutor_info['last_name'],
                'full_name': f"{tutor_info['first_name']} {tutor_info['last_name']}",
                'avatar': tutor_info['avatar'],
                'hourly_rate': tutor_info['hourly_rate'],
                'average_rating': tutor_info['average_rating'],
                'match_percentage': float(np.clip(hybrid_scores[idx], 0, 100)),
                'similarity_score': float(np.clip(similarity_scores[idx], 0, 1)),
                'match_reasons': match_reasons,
                'score_breakdown': {
                    'similarity': float(similarity_scores[idx] * 100),
                    'rating': float(rating_scores[idx]),
                    'price_fit': float(price_fit_scores[idx]),
                }
            }
            recommendations.append(recommendation)
        
        logger.info(f"✅ Generated {len(recommendations)} recommendations")
        return recommendations
    
    except Exception as e:
        logger.error(f"❌ Error generating recommendations: {e}")
        traceback.print_exc()
        return []


if __name__ == '__main__':
    # Quick test
    logger.info("Testing recommender...")
    recs = get_recommendations(custom_query="Python machine learning data science")
    for rec in recs[:5]:
        logger.info(f"{rec['full_name']}: {rec['match_percentage']:.1f}%")
