"""
=============================================================================
Find My Tutor (FMT) - Sentiment Analysis Module
=============================================================================

This module provides sentiment analysis capabilities for review comments
using TextBlob's Natural Language Processing (NLP).

ALGORITHM OVERVIEW:
-------------------
TextBlob uses a lexicon-based approach combined with pattern analysis:

1. TOKENIZATION: Text is broken into words and phrases
2. LEXICON LOOKUP: Each word is looked up in a sentiment lexicon
   - Words have pre-assigned polarity scores (e.g., "excellent" = +0.8)
3. PATTERN ANALYSIS: Considers modifiers and negations
   - "not good" → negative (despite "good" being positive)
4. AGGREGATION: Combines individual scores into overall sentiment

POLARITY SCORE:
- Range: -1.0 (most negative) to +1.0 (most positive)
- 0.0 is neutral

SUBJECTIVITY SCORE:
- Range: 0.0 (objective/factual) to 1.0 (subjective/opinion)
- Helps identify whether text expresses opinions vs. facts

USE CASES IN FMT:
-----------------
1. Auto-tag reviews before saving to database
2. Filter and moderate inappropriate content
3. Analyze tutor performance trends
4. Generate sentiment-based insights for tutors

Author: FMT Development Team
Date: December 2024
=============================================================================
"""

import logging
import re
from typing import Dict, Any, Optional, List, Tuple
from enum import Enum

# TextBlob for sentiment analysis
from textblob import TextBlob

# Configure logging
logger = logging.getLogger(__name__)


class SentimentLabel(Enum):
    """Enumeration for sentiment classification labels."""
    POSITIVE = "Positive"
    NEUTRAL = "Neutral"
    NEGATIVE = "Negative"


# =============================================================================
# CORE SENTIMENT ANALYSIS FUNCTIONS
# =============================================================================

def analyze_sentiment(text: str) -> Dict[str, Any]:
    """
    Analyze the sentiment of a given text.
    
    This function uses TextBlob's sentiment analysis to determine:
    1. Polarity: How positive or negative the text is (-1 to +1)
    2. Subjectivity: How subjective/opinionated the text is (0 to 1)
    3. Label: Classification as Positive, Neutral, or Negative
    
    CLASSIFICATION THRESHOLDS:
    - Positive: polarity > 0.1
    - Neutral: -0.1 <= polarity <= 0.1
    - Negative: polarity < -0.1
    
    Args:
        text: The text to analyze (e.g., a review comment)
        
    Returns:
        Dictionary containing:
        - polarity_score: float (-1 to 1)
        - subjectivity_score: float (0 to 1)
        - sentiment_label: str ("Positive", "Neutral", "Negative")
        - confidence: str ("High", "Medium", "Low")
        - word_count: int
    
    Example:
        >>> analyze_sentiment("This tutor is excellent! Very helpful.")
        {
            'polarity_score': 0.75,
            'subjectivity_score': 0.8,
            'sentiment_label': 'Positive',
            'confidence': 'High',
            'word_count': 6
        }
    """
    # Handle empty or invalid input
    if not text or not isinstance(text, str):
        return {
            'polarity_score': 0.0,
            'subjectivity_score': 0.0,
            'sentiment_label': SentimentLabel.NEUTRAL.value,
            'confidence': 'Low',
            'word_count': 0,
            'error': 'Empty or invalid text provided'
        }
    
    # Clean the text
    cleaned_text = _preprocess_text(text)
    
    if not cleaned_text:
        return {
            'polarity_score': 0.0,
            'subjectivity_score': 0.0,
            'sentiment_label': SentimentLabel.NEUTRAL.value,
            'confidence': 'Low',
            'word_count': 0,
            'error': 'Text contains no analyzable content'
        }
    
    try:
        # Create TextBlob object
        blob = TextBlob(cleaned_text)
        
        # Get sentiment scores
        polarity = blob.sentiment.polarity      # -1 to 1
        subjectivity = blob.sentiment.subjectivity  # 0 to 1
        
        # Classify sentiment based on polarity thresholds
        if polarity > 0.1:
            label = SentimentLabel.POSITIVE.value
        elif polarity < -0.1:
            label = SentimentLabel.NEGATIVE.value
        else:
            label = SentimentLabel.NEUTRAL.value
        
        # Calculate confidence based on polarity magnitude and subjectivity
        confidence = _calculate_confidence(polarity, subjectivity)
        
        # Count words
        word_count = len(cleaned_text.split())
        
        result = {
            'polarity_score': round(polarity, 4),
            'subjectivity_score': round(subjectivity, 4),
            'sentiment_label': label,
            'confidence': confidence,
            'word_count': word_count
        }
        
        logger.info(f"Sentiment analysis: '{text[:50]}...' -> {label} ({polarity:.2f})")
        
        return result
        
    except Exception as e:
        logger.error(f"Sentiment analysis error: {str(e)}")
        return {
            'polarity_score': 0.0,
            'subjectivity_score': 0.0,
            'sentiment_label': SentimentLabel.NEUTRAL.value,
            'confidence': 'Low',
            'word_count': 0,
            'error': str(e)
        }


def analyze_sentiment_detailed(text: str) -> Dict[str, Any]:
    """
    Perform detailed sentiment analysis with additional insights.
    
    Extends basic analysis with:
    - Sentence-by-sentence breakdown
    - Key phrases extraction
    - Emotion indicators
    - Recommendation for content moderation
    
    Args:
        text: The text to analyze
        
    Returns:
        Comprehensive sentiment analysis results
    """
    # Get basic analysis first
    basic_result = analyze_sentiment(text)
    
    if 'error' in basic_result:
        return basic_result
    
    try:
        blob = TextBlob(text)
        
        # Analyze each sentence
        sentence_analysis = []
        for sentence in blob.sentences:
            sent_polarity = sentence.sentiment.polarity
            sent_label = (
                SentimentLabel.POSITIVE.value if sent_polarity > 0.1
                else SentimentLabel.NEGATIVE.value if sent_polarity < -0.1
                else SentimentLabel.NEUTRAL.value
            )
            sentence_analysis.append({
                'text': str(sentence),
                'polarity': round(sent_polarity, 4),
                'label': sent_label
            })
        
        # Extract noun phrases (key topics)
        key_phrases = list(blob.noun_phrases)[:10]
        
        # Detect emotion indicators
        emotions = _detect_emotions(text)
        
        # Content moderation recommendation
        moderation = _get_moderation_recommendation(
            basic_result['polarity_score'],
            basic_result['subjectivity_score'],
            text
        )
        
        # Combine results
        detailed_result = {
            **basic_result,
            'sentence_analysis': sentence_analysis,
            'key_phrases': key_phrases,
            'emotions': emotions,
            'moderation': moderation,
            'analysis_type': 'detailed'
        }
        
        return detailed_result
        
    except Exception as e:
        logger.error(f"Detailed sentiment analysis error: {str(e)}")
        return {
            **basic_result,
            'error': str(e)
        }


def batch_analyze_sentiments(texts: List[str]) -> List[Dict[str, Any]]:
    """
    Analyze sentiment for multiple texts efficiently.
    
    Useful for batch processing reviews or analyzing trends.
    
    Args:
        texts: List of text strings to analyze
        
    Returns:
        List of sentiment analysis results
    """
    results = []
    
    for text in texts:
        result = analyze_sentiment(text)
        results.append(result)
    
    return results


def get_sentiment_summary(texts: List[str]) -> Dict[str, Any]:
    """
    Generate a summary of sentiments across multiple texts.
    
    Useful for generating tutor performance reports.
    
    Args:
        texts: List of review texts
        
    Returns:
        Summary statistics including:
        - Total reviews analyzed
        - Average polarity
        - Sentiment distribution (positive/neutral/negative counts)
        - Most common key phrases
    """
    if not texts:
        return {
            'total_reviews': 0,
            'average_polarity': 0.0,
            'distribution': {'positive': 0, 'neutral': 0, 'negative': 0},
            'overall_sentiment': SentimentLabel.NEUTRAL.value
        }
    
    results = batch_analyze_sentiments(texts)
    
    # Calculate statistics
    polarities = [r['polarity_score'] for r in results if 'error' not in r]
    avg_polarity = sum(polarities) / len(polarities) if polarities else 0
    
    # Count distribution
    positive_count = sum(1 for r in results if r['sentiment_label'] == SentimentLabel.POSITIVE.value)
    neutral_count = sum(1 for r in results if r['sentiment_label'] == SentimentLabel.NEUTRAL.value)
    negative_count = sum(1 for r in results if r['sentiment_label'] == SentimentLabel.NEGATIVE.value)
    
    # Determine overall sentiment
    if avg_polarity > 0.1:
        overall = SentimentLabel.POSITIVE.value
    elif avg_polarity < -0.1:
        overall = SentimentLabel.NEGATIVE.value
    else:
        overall = SentimentLabel.NEUTRAL.value
    
    return {
        'total_reviews': len(texts),
        'average_polarity': round(avg_polarity, 4),
        'distribution': {
            'positive': positive_count,
            'neutral': neutral_count,
            'negative': negative_count
        },
        'percentage': {
            'positive': round(positive_count / len(texts) * 100, 1),
            'neutral': round(neutral_count / len(texts) * 100, 1),
            'negative': round(negative_count / len(texts) * 100, 1)
        },
        'overall_sentiment': overall
    }


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _preprocess_text(text: str) -> str:
    """
    Clean and preprocess text for sentiment analysis.
    
    Steps:
    1. Remove URLs
    2. Remove special characters (keep letters, numbers, spaces)
    3. Normalize whitespace
    4. Convert to lowercase (optional - TextBlob handles this)
    
    Args:
        text: Raw text input
        
    Returns:
        Cleaned text string
    """
    # Remove URLs
    text = re.sub(r'http\S+|www\S+', '', text)
    
    # Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)
    
    # Keep letters, numbers, basic punctuation, and spaces
    text = re.sub(r'[^\w\s.,!?\'"-]', ' ', text)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    return text.strip()


def _calculate_confidence(polarity: float, subjectivity: float) -> str:
    """
    Calculate confidence level of the sentiment classification.
    
    Factors considered:
    1. Magnitude of polarity (stronger = more confident)
    2. Subjectivity (more subjective text = more confident in sentiment)
    
    Args:
        polarity: Polarity score (-1 to 1)
        subjectivity: Subjectivity score (0 to 1)
        
    Returns:
        Confidence level: "High", "Medium", or "Low"
    """
    polarity_magnitude = abs(polarity)
    
    # High confidence: strong polarity and subjective text
    if polarity_magnitude > 0.5 and subjectivity > 0.5:
        return "High"
    # Medium confidence: moderate polarity or subjectivity
    elif polarity_magnitude > 0.2 or subjectivity > 0.3:
        return "Medium"
    # Low confidence: weak signals
    else:
        return "Low"


def _detect_emotions(text: str) -> Dict[str, bool]:
    """
    Detect basic emotion indicators in text.
    
    Uses keyword matching for common emotion expressions.
    This is a simplified approach - for production, consider
    using dedicated emotion detection models.
    
    Args:
        text: Text to analyze
        
    Returns:
        Dictionary of detected emotions
    """
    text_lower = text.lower()
    
    # Emotion keyword patterns
    emotion_patterns = {
        'joy': r'\b(happy|joy|delighted|pleased|wonderful|amazing|fantastic|great|love|loved)\b',
        'gratitude': r'\b(thank|grateful|appreciate|appreciative|thankful)\b',
        'frustration': r'\b(frustrated|annoying|annoyed|irritated|disappointing|disappointed)\b',
        'satisfaction': r'\b(satisfied|helpful|recommend|excellent|professional|effective)\b',
        'confusion': r'\b(confused|confusing|unclear|difficult to understand|lost)\b',
        'enthusiasm': r'\b(enthusiastic|excited|eager|motivated|inspired|inspiring)\b'
    }
    
    emotions = {}
    for emotion, pattern in emotion_patterns.items():
        emotions[emotion] = bool(re.search(pattern, text_lower))
    
    return emotions


def _get_moderation_recommendation(
    polarity: float,
    subjectivity: float,
    text: str
) -> Dict[str, Any]:
    """
    Provide content moderation recommendations.
    
    Flags potentially problematic content and suggests actions.
    
    Args:
        polarity: Sentiment polarity score
        subjectivity: Subjectivity score
        text: Original text
        
    Returns:
        Moderation recommendation dictionary
    """
    text_lower = text.lower()
    
    # Check for potentially problematic patterns
    issues = []
    
    # Very negative content
    if polarity < -0.6:
        issues.append("Highly negative sentiment detected")
    
    # Check for offensive language patterns (simplified)
    offensive_patterns = [
        r'\b(hate|terrible|worst|awful|horrible|useless|waste)\b'
    ]
    for pattern in offensive_patterns:
        if re.search(pattern, text_lower):
            issues.append("Strong negative language detected")
            break
    
    # Determine action
    if len(issues) >= 2:
        action = "review_required"
        auto_approve = False
    elif len(issues) == 1:
        action = "flag_for_review"
        auto_approve = True
    else:
        action = "auto_approve"
        auto_approve = True
    
    return {
        'auto_approve': auto_approve,
        'action': action,
        'issues': issues,
        'review_priority': 'high' if not auto_approve else 'low'
    }


# =============================================================================
# INTEGRATION WITH TUTOR RECOMMENDATIONS
# =============================================================================

def analyze_tutor_reviews(tutor_id: str) -> Dict[str, Any]:
    """
    Analyze all reviews for a specific tutor.
    
    Fetches reviews from database and provides sentiment summary.
    Can be integrated with the recommender for quality scoring.
    
    Args:
        tutor_id: UUID of the tutor
        
    Returns:
        Sentiment analysis summary for the tutor's reviews
    """
    from django.db import connection
    
    try:
        # Fetch reviews for this tutor
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT review_text 
                FROM ratings 
                WHERE tutor_id = %s AND review_text IS NOT NULL AND review_text != ''
            """, [tutor_id])
            rows = cursor.fetchall()
        
        if not rows:
            return {
                'tutor_id': tutor_id,
                'total_reviews': 0,
                'sentiment_summary': None,
                'message': 'No reviews found for this tutor'
            }
        
        # Extract review texts
        review_texts = [row[0] for row in rows]
        
        # Get sentiment summary
        summary = get_sentiment_summary(review_texts)
        
        return {
            'tutor_id': tutor_id,
            **summary
        }
        
    except Exception as e:
        logger.error(f"Error analyzing tutor reviews: {str(e)}")
        return {
            'tutor_id': tutor_id,
            'error': str(e)
        }
