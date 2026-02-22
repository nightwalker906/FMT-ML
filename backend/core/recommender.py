"""
=============================================================================
Find My Tutor (FMT) - ML-Powered Recommendation Engine
=============================================================================

This module implements a Content-Based Filtering recommendation system using
TF-IDF (Term Frequency-Inverse Document Frequency) and Cosine Similarity.

ALGORITHM OVERVIEW:
-------------------
1. TF-IDF (Term Frequency-Inverse Document Frequency):
   - TF: Measures how frequently a term appears in a document
         TF(t,d) = (Number of times term t appears in document d) / (Total terms in d)
   
   - IDF: Measures how important a term is across all documents
         IDF(t) = log(Total documents / Documents containing term t)
   
   - TF-IDF = TF × IDF
     High TF-IDF means the term is frequent in the document but rare overall,
     making it a good discriminator.

2. Cosine Similarity:
   - Measures the cosine of the angle between two vectors in n-dimensional space
   - Formula: cos(θ) = (A · B) / (||A|| × ||B||)
   - Range: 0 (completely different) to 1 (identical)
   - Used because it's effective for text comparison regardless of document length

WORKFLOW:
---------
1. Fetch all available tutors from the database
2. Create a "text soup" for each tutor (combining subjects + bio)
3. Vectorize all tutor documents using TF-IDF
4. Vectorize the student's query using the same vectorizer
5. Calculate cosine similarity between query and all tutors
6. Rank by similarity score (primary) and rating (secondary)
7. Return top N matches

Author: FMT Development Team
Date: December 2024
=============================================================================
"""

import os
import time
import logging
import threading
from typing import List, Dict, Any, Optional
from decimal import Decimal

# Data Science imports
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Django imports
from django.db import connection
from django.conf import settings

# Configure logging
logger = logging.getLogger(__name__)

# =============================================================================
# CACHED SINGLETON - Keeps the fitted model in memory across requests
# =============================================================================
_recommender_instance = None
_recommender_lock = threading.Lock()
_last_fitted_at = 0
CACHE_TTL_SECONDS = 300  # Re-fit every 5 minutes


class TutorRecommender:
    """
    Content-Based Filtering Recommendation Engine for Tutors.
    
    This class encapsulates the ML logic for matching students with tutors
    based on their search queries using TF-IDF and Cosine Similarity.
    
    Attributes:
        vectorizer (TfidfVectorizer): Scikit-learn TF-IDF vectorizer
        tutor_matrix (sparse matrix): TF-IDF vectors for all tutors
        tutors_df (DataFrame): Pandas DataFrame containing tutor data
    """
    
    def __init__(self):
        """Initialize the recommender with a TF-IDF vectorizer."""
        # Initialize TF-IDF Vectorizer with English stop words
        # Stop words are common words (the, is, at, etc.) that don't add meaning
        self.vectorizer = TfidfVectorizer(
            stop_words='english',      # Remove common English words
            lowercase=True,            # Convert all text to lowercase
            ngram_range=(1, 2),        # Use unigrams and bigrams for better matching
            max_features=5000,         # Limit vocabulary size for performance
            min_df=1,                  # Minimum document frequency
            max_df=0.95                # Ignore terms that appear in >95% of docs
        )
        self.tutor_matrix = None
        self.tutors_df = None
        
    def fetch_tutors_from_database(self, max_price: Optional[float] = None) -> pd.DataFrame:
        """
        Fetch tutor data from the PostgreSQL database.
        
        Uses raw SQL for optimal performance with large datasets.
        Joins tutors with profiles to get complete tutor information.
        
        Args:
            max_price: Maximum hourly rate filter (optional)
            
        Returns:
            DataFrame with tutor information
        """
        try:
            # Build the SQL query with JOIN to get profile information
            # We select all necessary fields for recommendation
            query = """
                SELECT 
                    t.profile_id as id,
                    p.first_name,
                    p.last_name,
                    CONCAT(p.first_name, ' ', p.last_name) as full_name,
                    t.bio_text,
                    t.qualifications,
                    t.teaching_style,
                    t.availability,
                    t.location,
                    t.phone_number,
                    t.hourly_rate,
                    t.average_rating,
                    t.experience_years,
                    p.is_online
                FROM tutors t
                INNER JOIN profiles p ON t.profile_id = p.id
                WHERE p.user_type = 'tutor'
            """
            
            params = []
            
            # Apply price filter if specified
            if max_price is not None:
                query += " AND t.hourly_rate <= %s"
                params.append(max_price)
            
            # Order by rating for consistent results
            query += " ORDER BY t.average_rating DESC NULLS LAST"
            
            # Execute query using Django's database connection
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
            
            # Convert to DataFrame for easier manipulation
            df = pd.DataFrame(rows, columns=columns)
            
            logger.info(f"Fetched {len(df)} tutors from database")
            
            return df
            
        except Exception as e:
            logger.error(f"Database fetch error: {str(e)}")
            raise
    
    def create_text_soup(self, row: pd.Series) -> str:
        """
        Create a combined text document for each tutor.
        
        This "text soup" combines all relevant text fields that describe
        a tutor's expertise and teaching style. This combined text is what 
        gets vectorized for content-based filtering.
        
        FIELD WEIGHTING:
        - Subjects/Qualifications: 3x weight (most important for matching)
        - Teaching Style: 2x weight (important for learning compatibility)
        - Bio/About: 2x weight (describes expertise and approach)
        - Location: 1x weight (geographic matching)
        - Availability: 1x weight (schedule alignment)
        
        The more relevant terms appear in this soup, the higher the
        TF-IDF score will be for matching queries.
        
        Args:
            row: A pandas Series representing one tutor
            
        Returns:
            Combined text string for TF-IDF vectorization
        """
        text_parts = []
        
        # 1. SUBJECTS/QUALIFICATIONS (3x weight - most important)
        # Qualifications are stored as a JSON array of subject names
        qualifications = row.get('qualifications', [])
        if qualifications:
            if isinstance(qualifications, list):
                # Triple weight for subjects - most important matching factor
                subjects_text = ' '.join(qualifications)
                text_parts.extend([subjects_text, subjects_text, subjects_text])
            elif isinstance(qualifications, str):
                text_parts.extend([qualifications, qualifications, qualifications])
        
        # 2. TEACHING STYLE (2x weight - important for learning compatibility)
        teaching_style = row.get('teaching_style', '')
        if teaching_style and isinstance(teaching_style, str):
            text_parts.extend([teaching_style, teaching_style])
        
        # 3. BIOGRAPHY/ABOUT (2x weight - describes expertise and approach)
        bio = row.get('bio_text', '')
        if bio and isinstance(bio, str):
            text_parts.extend([bio, bio])
        
        # 4. LOCATION (1x weight - geographic matching)
        # Location helps match students looking for local tutors
        location = row.get('location', '')
        if location and isinstance(location, str):
            # Add location terms to help match geographic preferences
            text_parts.append(location.lower())
        
        # 5. AVAILABILITY (1x weight - schedule alignment)
        # Availability is stored as JSON, extract relevant info
        availability = row.get('availability', {})
        if availability:
            if isinstance(availability, dict):
                # Extract days and create readable text
                days = availability.get('days', [])
                if days:
                    availability_text = ' '.join(days) + ' tutor flexible schedule'
                    text_parts.append(availability_text)
            elif isinstance(availability, str):
                text_parts.append(availability)
        
        # Combine all text parts
        combined = ' '.join(text_parts)
        
        # Clean up the text
        combined = combined.lower().strip()
        
        return combined if combined else "tutor educator teacher"
    
    def fit_transform(self, tutors_df: pd.DataFrame) -> None:
        """
        Fit the TF-IDF vectorizer on tutor data and transform to vectors.
        
        This creates the document-term matrix where:
        - Each row represents a tutor
        - Each column represents a term from the vocabulary
        - Each cell contains the TF-IDF weight for that term-document pair
        
        Args:
            tutors_df: DataFrame containing tutor information
        """
        self.tutors_df = tutors_df.copy()
        
        # Create text soup for each tutor
        self.tutors_df['text_soup'] = self.tutors_df.apply(self.create_text_soup, axis=1)
        
        # Log sample text soups for debugging
        logger.debug(f"Sample text soups:\n{self.tutors_df['text_soup'].head()}")
        
        # Fit and transform: Learn vocabulary and convert to TF-IDF vectors
        # This creates a sparse matrix of shape (n_tutors, n_features)
        self.tutor_matrix = self.vectorizer.fit_transform(self.tutors_df['text_soup'])
        
        logger.info(f"TF-IDF matrix shape: {self.tutor_matrix.shape}")
        logger.info(f"Vocabulary size: {len(self.vectorizer.vocabulary_)}")
    
    def _generate_explanation(
        self,
        query_vector,
        tutor_idx: int,
        tutor_row: pd.Series,
        original_query: str
    ) -> Dict[str, Any]:
        """
        Generate an XAI (Explainable AI) explanation for why a tutor was recommended.
        
        This method provides transparency into the recommendation by showing:
        1. Which keywords from the query matched the tutor's profile
        2. The contribution of each matching term to the final score
        3. A human-readable explanation summary
        
        EXPLAINABILITY APPROACH:
        - Extract terms with non-zero TF-IDF weights from both query and tutor
        - Identify overlapping terms (the "reason" for the match)
        - Calculate each term's contribution to the similarity score
        - Generate natural language explanation
        
        Args:
            query_vector: The TF-IDF vector of the student's query
            tutor_idx: Index of the tutor in the matrix
            tutor_row: The tutor's data row
            original_query: The original query string (for display)
            
        Returns:
            Dictionary containing explanation details
        """
        feature_names = self.vectorizer.get_feature_names_out()
        tutor_vector = self.tutor_matrix[tutor_idx]
        
        # Find matching terms between query and tutor
        matching_terms = []
        query_terms = []
        tutor_terms = []
        
        # Get query terms
        for idx in query_vector.nonzero()[1]:
            query_terms.append({
                'term': feature_names[idx],
                'weight': float(query_vector[0, idx])
            })
        
        # Get tutor terms and find matches
        for idx in tutor_vector.nonzero()[1]:
            term = feature_names[idx]
            tutor_weight = float(tutor_vector[0, idx])
            query_weight = float(query_vector[0, idx]) if query_vector[0, idx] > 0 else 0
            
            tutor_terms.append({'term': term, 'weight': tutor_weight})
            
            # If this term also appears in the query, it's a matching term
            if query_weight > 0:
                # Contribution = product of weights (component of dot product)
                contribution = query_weight * tutor_weight
                matching_terms.append({
                    'term': term,
                    'query_weight': round(query_weight, 4),
                    'tutor_weight': round(tutor_weight, 4),
                    'contribution': round(contribution, 4)
                })
        
        # Sort matching terms by contribution (most important first)
        matching_terms.sort(key=lambda x: x['contribution'], reverse=True)
        
        # Generate human-readable explanation
        explanation_text = self._generate_natural_explanation(
            tutor_row=tutor_row,
            matching_terms=matching_terms,
            original_query=original_query
        )
        
        # Determine match strength category
        match_percentage = float(tutor_row.get('match_percentage', 0))
        if match_percentage >= 70:
            match_strength = "Excellent"
        elif match_percentage >= 50:
            match_strength = "Strong"
        elif match_percentage >= 30:
            match_strength = "Good"
        elif match_percentage >= 15:
            match_strength = "Moderate"
        else:
            match_strength = "Partial"
        
        return {
            'summary': explanation_text,
            'match_strength': match_strength,
            'matching_keywords': [t['term'] for t in matching_terms[:5]],
            'detailed_matches': matching_terms[:10],
            'factors': self._get_recommendation_factors(tutor_row, matching_terms)
        }
    
    def _generate_natural_explanation(
        self,
        tutor_row: pd.Series,
        matching_terms: List[Dict],
        original_query: str
    ) -> str:
        """
        Generate a natural language explanation for the recommendation.
        
        Creates a human-friendly sentence explaining why this tutor matches.
        
        Args:
            tutor_row: The tutor's data
            matching_terms: List of matching terms with weights
            original_query: The original search query
            
        Returns:
            Human-readable explanation string
        """
        tutor_name = tutor_row.get('full_name', 'This tutor')
        subjects = tutor_row.get('qualifications', [])
        rating = tutor_row.get('average_rating')
        experience = tutor_row.get('experience_years', 0)
        
        # Extract top matching keywords (capitalize for readability)
        top_keywords = [t['term'].title() for t in matching_terms[:3]]
        
        # Build explanation parts
        explanation_parts = []
        
        # Main matching reason
        if top_keywords:
            if len(top_keywords) == 1:
                explanation_parts.append(
                    f"{tutor_name} specializes in {top_keywords[0]}, which matches your search"
                )
            elif len(top_keywords) == 2:
                explanation_parts.append(
                    f"{tutor_name} has expertise in {top_keywords[0]} and {top_keywords[1]}, matching your requirements"
                )
            else:
                keywords_str = ", ".join(top_keywords[:-1]) + f", and {top_keywords[-1]}"
                explanation_parts.append(
                    f"{tutor_name} covers {keywords_str}, which align with your search"
                )
        else:
            explanation_parts.append(f"{tutor_name} has relevant teaching experience")
        
        # Add rating info if available
        if rating and rating >= 4.0:
            explanation_parts.append(f"with an excellent rating of {rating:.1f}/5")
        elif rating and rating >= 3.5:
            explanation_parts.append(f"with a good rating of {rating:.1f}/5")
        
        # Add experience info
        if experience >= 10:
            explanation_parts.append(f"and {experience} years of teaching experience")
        elif experience >= 5:
            explanation_parts.append(f"and {experience} years of experience")
        
        # Combine into final explanation
        explanation = ". ".join(explanation_parts) + "."
        
        return explanation
    
    def _get_recommendation_factors(
        self,
        tutor_row: pd.Series,
        matching_terms: List[Dict]
    ) -> List[Dict[str, Any]]:
        """
        Get the key factors that contributed to this recommendation.
        
        Breaks down the recommendation into understandable factors.
        
        Args:
            tutor_row: The tutor's data
            matching_terms: List of matching terms
            
        Returns:
            List of factor dictionaries with name, value, and impact
        """
        factors = []
        
        # Factor 1: Keyword Match
        if matching_terms:
            keyword_score = sum(t['contribution'] for t in matching_terms)
            factors.append({
                'factor': 'Keyword Relevance',
                'description': f"Matched {len(matching_terms)} keyword(s) from your search",
                'keywords': [t['term'] for t in matching_terms[:5]],
                'impact': 'high' if len(matching_terms) >= 3 else 'medium' if len(matching_terms) >= 1 else 'low'
            })
        
        # Factor 2: Subject Expertise
        subjects = tutor_row.get('qualifications', [])
        if subjects and isinstance(subjects, list):
            factors.append({
                'factor': 'Subject Expertise',
                'description': f"Teaches {len(subjects)} subject(s)",
                'subjects': subjects[:5],
                'impact': 'high' if len(subjects) >= 3 else 'medium'
            })
        
        # Factor 3: Rating
        rating = tutor_row.get('average_rating')
        if rating:
            impact = 'high' if rating >= 4.5 else 'medium' if rating >= 3.5 else 'low'
            factors.append({
                'factor': 'Student Rating',
                'description': f"Rated {float(rating):.1f} out of 5 by students",
                'value': float(rating),
                'impact': impact
            })
        
        # Factor 4: Experience
        experience = tutor_row.get('experience_years', 0)
        if experience:
            impact = 'high' if experience >= 10 else 'medium' if experience >= 5 else 'low'
            factors.append({
                'factor': 'Teaching Experience',
                'description': f"{experience} years of tutoring experience",
                'value': experience,
                'impact': impact
            })
        
        # Factor 5: Price Value
        hourly_rate = tutor_row.get('hourly_rate')
        if hourly_rate:
            rate = float(hourly_rate)
            if rate <= 30:
                impact = 'high'
                desc = "Budget-friendly option"
            elif rate <= 60:
                impact = 'medium'
                desc = "Moderately priced"
            else:
                impact = 'low'
                desc = "Premium tutor"
            factors.append({
                'factor': 'Price',
                'description': f"${rate:.0f}/hour - {desc}",
                'value': rate,
                'impact': impact
            })
        
        return factors

    def get_recommendations(
        self,
        query: str,
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get tutor recommendations based on a student's query with XAI explanations.
        
        ALGORITHM STEPS:
        1. Transform the query into a TF-IDF vector using the same vocabulary
        2. Calculate cosine similarity between query and all tutors
        3. Sort by similarity score (descending)
        4. Generate XAI explanation for each recommendation
        5. Return top N results with relevant metadata and explanations
        
        MATHEMATICAL EXPLANATION:
        - Query vector Q and Tutor vector T are both in n-dimensional space
        - Cosine similarity = dot(Q, T) / (norm(Q) * norm(T))
        - Result is between 0 (orthogonal/different) and 1 (parallel/similar)
        
        XAI (EXPLAINABLE AI) FEATURES:
        - Each recommendation includes a human-readable explanation
        - Matching keywords are highlighted with their contribution scores
        - Recommendation factors (rating, experience, price) are broken down
        
        Args:
            query: Student's search query (e.g., "I need help with Calculus")
            top_n: Number of recommendations to return
            
        Returns:
            List of dictionaries containing tutor info, similarity scores, and explanations
        """
        if self.tutor_matrix is None or self.tutors_df is None:
            raise ValueError("Recommender not fitted. Call fit_transform first.")
        
        if not query or not query.strip():
            logger.warning("Empty query provided")
            return []
        
        # Store original query for explanation
        original_query = query
        
        # Clean the query
        query = query.lower().strip()
        
        # Transform query into TF-IDF vector using fitted vocabulary
        # Important: Use transform (not fit_transform) to use same vocabulary
        query_vector = self.vectorizer.transform([query])
        
        # Calculate cosine similarity between query and all tutors
        # Returns array of shape (1, n_tutors)
        similarity_scores = cosine_similarity(query_vector, self.tutor_matrix)
        
        # Flatten to 1D array
        scores = similarity_scores.flatten()
        
        # Add scores to DataFrame
        self.tutors_df['similarity_score'] = scores
        
        # Calculate match percentage (similarity * 100)
        self.tutors_df['match_percentage'] = self.tutors_df['similarity_score'] * 100
        
        # Sort by similarity score (primary) and average_rating (secondary)
        # This ensures we get the most relevant AND highly rated tutors
        sorted_df = self.tutors_df.sort_values(
            by=['similarity_score', 'average_rating'],
            ascending=[False, False]
        )
        
        # Filter out zero similarity (no match at all)
        sorted_df = sorted_df[sorted_df['similarity_score'] > 0]
        
        # Get top N results
        top_tutors = sorted_df.head(top_n)
        
        # Convert to list of dictionaries for JSON response
        results = []
        for idx, row in top_tutors.iterrows():
            # Generate XAI explanation for this recommendation
            explanation = self._generate_explanation(
                query_vector=query_vector,
                tutor_idx=idx,
                tutor_row=row,
                original_query=original_query
            )
            
            tutor_dict = {
                'id': str(row['id']),
                'full_name': row['full_name'],
                'first_name': row['first_name'],
                'last_name': row['last_name'],
                'subjects': row['qualifications'] if isinstance(row['qualifications'], list) else [],
                'bio': row['bio_text'] if pd.notna(row['bio_text']) else '',
                'teaching_style': row['teaching_style'] if pd.notna(row['teaching_style']) else '',
                'hourly_rate': float(row['hourly_rate']) if pd.notna(row['hourly_rate']) else 0.0,
                'average_rating': float(row['average_rating']) if pd.notna(row['average_rating']) else None,
                'experience_years': int(row['experience_years']) if pd.notna(row['experience_years']) else 0,
                'is_online': bool(row['is_online']) if pd.notna(row['is_online']) else False,
                'similarity_score': round(float(row['similarity_score']), 4),
                'match_percentage': round(float(row['match_percentage']), 1),
                # XAI Explanation fields
                'explanation': explanation
            }
            results.append(tutor_dict)
        
        logger.info(f"Found {len(results)} matching tutors for query: '{original_query}'")
        
        return results


# =============================================================================
# MAIN API FUNCTION
# =============================================================================

def _get_or_create_recommender(max_price: Optional[float] = None) -> TutorRecommender:
    """
    Return the cached singleton recommender, re-fitting only when the cache
    has expired (every 5 minutes).  Thread-safe.
    """
    global _recommender_instance, _last_fitted_at

    now = time.time()
    needs_refresh = (
        _recommender_instance is None
        or (now - _last_fitted_at) > CACHE_TTL_SECONDS
    )

    if needs_refresh:
        with _recommender_lock:
            # Double-check after acquiring lock
            if _recommender_instance is None or (time.time() - _last_fitted_at) > CACHE_TTL_SECONDS:
                start = time.time()
                logger.info("[Recommender] Fitting TF-IDF model (cache miss / expired)...")

                recommender = TutorRecommender()
                tutors_df = recommender.fetch_tutors_from_database(max_price=max_price)

                if tutors_df.empty:
                    logger.warning("No tutors found in database")
                    return recommender  # return unfitted; callers handle this

                recommender.fit_transform(tutors_df)
                _recommender_instance = recommender
                _last_fitted_at = time.time()

                elapsed = round(time.time() - start, 3)
                logger.info(f"[Recommender] Model fitted in {elapsed}s  "
                            f"({len(tutors_df)} tutors, vocab={len(recommender.vectorizer.vocabulary_)})")

    return _recommender_instance


def warmup_recommender() -> None:
    """
    Pre-fit the recommender at server startup so the first request is instant.
    Called from CoreConfig.ready().
    """
    try:
        logger.info("[Recommender] Warming up recommendation engine...")
        _get_or_create_recommender()
        logger.info("[Recommender] ✅ Warm-up complete — first request will be instant.")
    except Exception as e:
        logger.warning(f"[Recommender] ⚠️ Warm-up failed (non-fatal): {e}")


def invalidate_recommender_cache() -> None:
    """
    Force the recommender to re-fit on next request.
    Call this when tutors are added/updated/deleted.
    """
    global _recommender_instance, _last_fitted_at
    with _recommender_lock:
        _recommender_instance = None
        _last_fitted_at = 0
    logger.info("[Recommender] Cache invalidated — will re-fit on next request.")


def get_recommendations(
    query: str,
    max_price: Optional[float] = None,
    top_n: int = 10
) -> List[Dict[str, Any]]:
    """
    Main entry point for the recommendation system.
    
    Uses a cached singleton recommender so the expensive TF-IDF fitting
    only happens once every 5 minutes, not on every request.
    
    Args:
        query: Student's search query
        max_price: Maximum hourly rate filter (optional)
        top_n: Number of recommendations to return (default: 10)
        
    Returns:
        List of recommended tutors with similarity scores
    """
    try:
        start = time.time()

        recommender = _get_or_create_recommender(max_price=max_price)

        if recommender.tutor_matrix is None:
            logger.warning("Recommender has no fitted data")
            return []

        recommendations = recommender.get_recommendations(
            query=query,
            top_n=top_n
        )

        elapsed = round(time.time() - start, 3)
        logger.info(f"[Recommender] Recommendations served in {elapsed}s (cached model)")

        return recommendations
        
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        return []


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_similar_tutors(tutor_id: str, top_n: int = 5) -> List[Dict[str, Any]]:
    """
    Find tutors similar to a given tutor.
    
    This can be used for "Students also viewed" or "Similar tutors" features.
    Uses the cached singleton recommender for instant results.
    
    Args:
        tutor_id: UUID of the reference tutor
        top_n: Number of similar tutors to return
        
    Returns:
        List of similar tutors
    """
    try:
        recommender = _get_or_create_recommender()
        
        if recommender.tutors_df is None or recommender.tutors_df.empty:
            return []
        
        # Find the reference tutor in the cached dataframe
        ref_rows = recommender.tutors_df[recommender.tutors_df['id'] == tutor_id]
        if ref_rows.empty:
            logger.warning(f"Tutor {tutor_id} not found")
            return []
        
        # Use the tutor's text soup as the query
        ref_text = ref_rows['text_soup'].iloc[0]
        
        # Get recommendations excluding the reference tutor
        results = recommender.get_recommendations(query=ref_text, top_n=top_n + 1)
        
        # Remove the reference tutor from results
        results = [r for r in results if r['id'] != tutor_id]
        
        return results[:top_n]
        
    except Exception as e:
        logger.error(f"Similar tutors error: {str(e)}")
        return []


def explain_recommendation(query: str, tutor_id: str) -> Dict[str, Any]:
    """
    Explain why a tutor was recommended for a query.
    Uses the cached singleton recommender for instant results.
    
    Args:
        query: The search query
        tutor_id: The tutor's UUID
        
    Returns:
        Dictionary with explanation details
    """
    try:
        recommender = _get_or_create_recommender()
        
        if recommender.tutors_df is None or recommender.tutors_df.empty:
            return {'error': 'No tutors found'}
        
        # Get query terms with non-zero TF-IDF weights
        query_vector = recommender.vectorizer.transform([query.lower()])
        feature_names = recommender.vectorizer.get_feature_names_out()
        
        # Get non-zero terms from query
        query_terms = []
        for idx in query_vector.nonzero()[1]:
            query_terms.append({
                'term': feature_names[idx],
                'weight': float(query_vector[0, idx])
            })
        
        # Sort by weight
        query_terms.sort(key=lambda x: x['weight'], reverse=True)
        
        # Find the tutor
        tutor_idx = recommender.tutors_df[recommender.tutors_df['id'] == tutor_id].index
        if len(tutor_idx) == 0:
            return {'error': 'Tutor not found'}
        
        tutor_idx = tutor_idx[0]
        tutor_vector = recommender.tutor_matrix[tutor_idx]
        
        # Get matching terms
        matching_terms = []
        for idx in tutor_vector.nonzero()[1]:
            if query_vector[0, idx] > 0:
                matching_terms.append({
                    'term': feature_names[idx],
                    'query_weight': float(query_vector[0, idx]),
                    'tutor_weight': float(tutor_vector[0, idx])
                })
        
        matching_terms.sort(key=lambda x: x['query_weight'] * x['tutor_weight'], reverse=True)
        
        return {
            'query': query,
            'tutor_id': tutor_id,
            'query_terms': query_terms[:10],
            'matching_terms': matching_terms[:10],
            'total_vocabulary_size': len(feature_names)
        }
        
    except Exception as e:
        logger.error(f"Explanation error: {str(e)}")
        return {'error': str(e)}
