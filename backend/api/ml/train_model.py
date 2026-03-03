"""
=============================================================================
OFFLINE TRAINING SCRIPT - High-Performance Tutor Recommendation Model
=============================================================================

Purpose:
  Pre-compute TF-IDF vectors for all tutors and serialize them to disk.
  This runs once (or periodically) to avoid expensive computation on every request.

Architecture:
  1. Database Connection: Fetch 1,000+ tutors from PostgreSQL
  2. Feature Engineering: Create combined_text from bio, teaching_style, qualifications
  3. NLP Pipeline: TF-IDF vectorization with stop words filtering
  4. Serialization: Save vectorizer, matrix, and tutor_ids to disk via joblib
  5. Validation: Verify saved artifacts and log statistics

Performance:
  - Training time: ~2-5 seconds for 1,000 tutors
  - Disk space: ~5-15 MB (vectorizer + sparse matrix)
  - Output format: Joblib binary (language-agnostic, fast deserialization)

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
from typing import List, Tuple, Optional
import django

# Setup Django if running standalone
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

# Data science & ML
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib

# Database
from django.db.models import Q
from core.models import Tutor, Profile

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

# Output directory for saved models
MODELS_DIR = Path(__file__).parent.parent.parent / 'saved_models'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# File paths for serialized artifacts
VECTORIZER_PATH = MODELS_DIR / 'tfidf_vectorizer.pkl'
MATRIX_PATH = MODELS_DIR / 'tfidf_matrix.pkl'
TUTOR_IDS_PATH = MODELS_DIR / 'tutor_ids.pkl'
METADATA_PATH = MODELS_DIR / 'training_metadata.json'

# TF-IDF Vectorizer hyperparameters
TFIDF_PARAMS = {
    'stop_words': 'english',        # Remove common English words
    'lowercase': True,               # Normalize to lowercase
    'ngram_range': (1, 2),          # Unigrams + bigrams
    'max_features': 5000,           # Limit vocabulary to top 5000 terms
    'min_df': 1,                    # Minimum document frequency
    'max_df': 0.95,                 # Ignore terms in >95% of documents
    'sublinear_tf': True,           # Apply sublinear TF scaling
}

# ═════════════════════════════════════════════════════════════════════════════
# DATA FETCHING
# ═════════════════════════════════════════════════════════════════════════════


def fetch_tutors_from_db() -> pd.DataFrame:
    """
    Fetch all tutors from the database using Django ORM.
    
    Returns:
        DataFrame with tutor data
    """
    try:
        logger.info("Fetching tutors from database...")
        
        tutors = Tutor.objects.select_related('profile').all()
        
        data = []
        for tutor in tutors:
            profile = tutor.profile
            data.append({
                'profile_id': str(profile.id),
                'first_name': profile.first_name,
                'last_name': profile.last_name,
                'avatar': profile.avatar,
                'bio_text': tutor.bio_text or '',
                'teaching_style': tutor.teaching_style or '',
                'qualifications': tutor.qualifications or [],
                'hourly_rate': float(tutor.hourly_rate) if tutor.hourly_rate else 0.0,
                'average_rating': float(tutor.average_rating) if tutor.average_rating else 0.0,
            })
        
        df = pd.DataFrame(data)
        logger.info(f"✅ Fetched {len(df)} tutors")
        
        if len(df) > 0:
            logger.info(f"   - Average rating: {df['average_rating'].mean():.2f}")
            logger.info(f"   - Avg hourly rate: ${df['hourly_rate'].mean():.2f}")
            logger.info(f"   - Non-null bio_text: {(df['bio_text'].str.len() > 0).sum()}/{len(df)}")
        
        return df
    except Exception as e:
        logger.error(f"❌ Error fetching tutors: {e}")
        raise


# ═════════════════════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# ═════════════════════════════════════════════════════════════════════════════


def parse_qualifications(quals: Optional[str]) -> str:
    """
    Parse JSON qualifications array and convert to text.
    
    Args:
        quals: Qualifications field (may be JSON string or list or None)
        
    Returns:
        Space-separated string of qualifications
    """
    if quals is None:
        return ""
    
    try:
        # If it's a string, try to parse as JSON
        if isinstance(quals, str):
            quals_list = json.loads(quals)
        else:
            quals_list = quals
        
        # Convert list to space-separated lowercase string
        if isinstance(quals_list, list):
            return ' '.join([str(q).lower() for q in quals_list])
        
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning(f"Failed to parse qualifications: {quals}")
    
    return ""


def create_combined_text(row: pd.Series) -> str:
    """
    Create a combined text document for each tutor with weighted fields.
    
    Weighting:
      - Qualifications: 3x (most important - subjects)
      - Teaching Style: 2x (important - learning compatibility)
      - Bio Text: 2x (expertise and approach)
    
    Args:
        row: A pandas Series representing one tutor
        
    Returns:
        Combined text string ready for TF-IDF vectorization
    """
    text_parts = []
    
    # 1. QUALIFICATIONS (3x weight)
    qualifications_text = parse_qualifications(row.get('qualifications'))
    if qualifications_text:
        text_parts.extend([qualifications_text] * 3)
    
    # 2. TEACHING STYLE (2x weight)
    teaching_style = row.get('teaching_style', '')
    if teaching_style and isinstance(teaching_style, str):
        teaching_style = teaching_style.lower().strip()
        if teaching_style:
            text_parts.extend([teaching_style] * 2)
    
    # 3. BIO TEXT (2x weight)
    bio_text = row.get('bio_text', '')
    if bio_text and isinstance(bio_text, str):
        bio_text = bio_text.lower().strip()
        if bio_text:
            text_parts.extend([bio_text] * 2)
    
    # Combine and clean
    combined = ' '.join(text_parts)
    combined = ' '.join(combined.split())  # Remove extra whitespace
    
    # Fallback
    return combined if combined else "tutor educator teacher"


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineer features by creating combined_text for each tutor.
    
    Args:
        df: DataFrame with raw tutor data
        
    Returns:
        DataFrame with new 'combined_text' column added
    """
    logger.info("Engineering features (creating combined_text)...")
    
    df['combined_text'] = df.apply(create_combined_text, axis=1)
    
    non_empty = (df['combined_text'].str.len() > 0).sum()
    logger.info(f"✅ Feature engineering complete")
    logger.info(f"   - Non-empty texts: {non_empty}/{len(df)}")
    logger.info(f"   - Avg text length: {df['combined_text'].str.len().mean():.0f} chars")
    
    return df


# ═════════════════════════════════════════════════════════════════════════════
# NLP VECTORIZATION
# ═════════════════════════════════════════════════════════════════════════════


def train_tfidf_vectorizer(texts: List[str]) -> Tuple[TfidfVectorizer, np.ndarray]:
    """
    Train a TF-IDF vectorizer on the combined texts.
    
    Args:
        texts: List of combined_text strings to vectorize
        
    Returns:
        Tuple of (fitted TfidfVectorizer, sparse TF-IDF matrix)
    """
    logger.info("Training TF-IDF vectorizer...")
    
    vectorizer = TfidfVectorizer(**TFIDF_PARAMS)
    
    try:
        tfidf_matrix = vectorizer.fit_transform(texts)
        
        logger.info(f"✅ TF-IDF vectorization complete")
        logger.info(f"   - Vocabulary size: {len(vectorizer.vocabulary_)} terms")
        logger.info(f"   - Matrix shape: {tfidf_matrix.shape} (tutors × features)")
        logger.info(f"   - Matrix density: {tfidf_matrix.nnz / (tfidf_matrix.shape[0] * tfidf_matrix.shape[1]) * 100:.2f}%")
        
        return vectorizer, tfidf_matrix
    
    except Exception as e:
        logger.error(f"❌ TF-IDF training failed: {e}")
        raise


# ═════════════════════════════════════════════════════════════════════════════
# SERIALIZATION & SAVING
# ═════════════════════════════════════════════════════════════════════════════


def save_artifacts(
    vectorizer: TfidfVectorizer,
    tfidf_matrix: np.ndarray,
    tutor_ids: List[str],
    df: pd.DataFrame
) -> None:
    """
    Serialize the vectorizer, matrix, and metadata to disk using joblib.
    
    Args:
        vectorizer: Fitted TfidfVectorizer
        tfidf_matrix: Sparse TF-IDF matrix
        tutor_ids: List of tutor profile_ids
        df: Original DataFrame with tutor data
    """
    logger.info("Saving artifacts to disk...")
    
    try:
        # Save vectorizer
        joblib.dump(vectorizer, VECTORIZER_PATH, compress=3)
        logger.info(f"✅ Saved vectorizer: {VECTORIZER_PATH}")
        
        # Save sparse matrix
        joblib.dump(tfidf_matrix, MATRIX_PATH, compress=3)
        logger.info(f"✅ Saved TF-IDF matrix: {MATRIX_PATH}")
        
        # Save tutor IDs
        joblib.dump(tutor_ids, TUTOR_IDS_PATH, compress=3)
        logger.info(f"✅ Saved tutor IDs: {TUTOR_IDS_PATH}")
        
        # Save metadata
        metadata = {
            'num_tutors': len(tutor_ids),
            'vocabulary_size': len(vectorizer.vocabulary_),
            'matrix_shape': tfidf_matrix.shape,
            'avg_rating': float(df['average_rating'].mean()),
            'avg_hourly_rate': float(df['hourly_rate'].mean()),
            'timestamp': pd.Timestamp.now().isoformat(),
        }
        with open(METADATA_PATH, 'w') as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"✅ Saved metadata: {METADATA_PATH}")
        
        # Print file sizes
        logger.info("\nFile sizes:")
        for path in [VECTORIZER_PATH, MATRIX_PATH, TUTOR_IDS_PATH, METADATA_PATH]:
            if path.exists():
                size_mb = path.stat().st_size / (1024 ** 2)
                logger.info(f"   - {path.name}: {size_mb:.2f} MB")
    
    except Exception as e:
        logger.error(f"❌ Error saving artifacts: {e}")
        raise


def validate_saved_artifacts() -> bool:
    """
    Verify that all required artifact files exist and can be loaded.
    
    Returns:
        True if all validations pass, False otherwise
    """
    logger.info("\nValidating saved artifacts...")
    
    required_files = [VECTORIZER_PATH, MATRIX_PATH, TUTOR_IDS_PATH, METADATA_PATH]
    
    # Check file existence
    for path in required_files:
        if not path.exists():
            logger.error(f"❌ Missing file: {path}")
            return False
    
    logger.info(f"✅ All 4 artifact files exist")
    
    try:
        # Try loading each artifact
        vectorizer = joblib.load(VECTORIZER_PATH)
        logger.info(f"✅ Vectorizer loaded: {len(vectorizer.vocabulary_)} terms")
        
        tfidf_matrix = joblib.load(MATRIX_PATH)
        logger.info(f"✅ TF-IDF matrix loaded: {tfidf_matrix.shape}")
        
        tutor_ids = joblib.load(TUTOR_IDS_PATH)
        logger.info(f"✅ Tutor IDs loaded: {len(tutor_ids)} tutors")
        
        with open(METADATA_PATH) as f:
            metadata = json.load(f)
        logger.info(f"✅ Metadata loaded: {metadata['num_tutors']} tutors")
        
        # Cross-validate shapes
        if tfidf_matrix.shape[0] != len(tutor_ids):
            logger.error(f"❌ Shape mismatch: matrix has {tfidf_matrix.shape[0]} rows but {len(tutor_ids)} IDs")
            return False
        
        logger.info(f"✅ All validations passed!")
        return True
    
    except Exception as e:
        logger.error(f"❌ Validation failed: {e}")
        traceback.print_exc()
        return False


# ═════════════════════════════════════════════════════════════════════════════
# MAIN TRAINING PIPELINE
# ═════════════════════════════════════════════════════════════════════════════


def main():
    """
    Execute the complete training pipeline.
    """
    logger.info("=" * 80)
    logger.info("STARTING OFFLINE MODEL TRAINING")
    logger.info("=" * 80)
    
    try:
        # Step 1: Fetch tutors
        df = fetch_tutors_from_db()
        
        if len(df) == 0:
            logger.error("❌ No tutors found in database!")
            return False
        
        # Step 2: Engineer features
        df = engineer_features(df)
        
        # Step 3: Train vectorizer
        vectorizer, tfidf_matrix = train_tfidf_vectorizer(df['combined_text'].tolist())
        
        # Extract tutor IDs
        tutor_ids = df['profile_id'].tolist()
        
        # Step 4: Save artifacts
        save_artifacts(vectorizer, tfidf_matrix, tutor_ids, df)
        
        # Step 5: Validate
        if validate_saved_artifacts():
            logger.info("\n" + "=" * 80)
            logger.info("✅ TRAINING COMPLETE - Models ready for production use!")
            logger.info("=" * 80)
            return True
        else:
            logger.error("\n" + "=" * 80)
            logger.error("❌ TRAINING FAILED - Validation did not pass!")
            logger.error("=" * 80)
            return False
    
    except Exception as e:
        logger.error(f"\n❌ TRAINING FAILED: {e}")
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
