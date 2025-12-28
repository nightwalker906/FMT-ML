"""
=============================================================================
Find My Tutor (FMT) - Smart Pricing Module (Predictive Analytics)
=============================================================================

This module implements a Linear Regression model to predict optimal hourly
rates for tutors based on their experience and subject expertise.

ALGORITHM OVERVIEW - LINEAR REGRESSION:
---------------------------------------
Linear Regression finds the best-fitting line through data points by
minimizing the sum of squared residuals (Ordinary Least Squares - OLS).

MATHEMATICAL MODEL:
    y = β₀ + β₁x₁ + β₂x₂ + ... + ε

Where:
    y  = Predicted hourly rate (target variable)
    β₀ = Intercept (base rate when experience = 0)
    β₁ = Coefficient for experience_years
    x₁ = Experience years (feature)
    ε  = Error term

HOW IT WORKS:
1. Collect training data: (experience_years, hourly_rate) pairs from tutors
2. Fit the model: Find β₀ and β₁ that minimize prediction errors
3. Predict: For a new tutor, calculate predicted_rate = β₀ + β₁ × experience

WHY LINEAR REGRESSION:
- Simple and interpretable (important for explaining to stakeholders)
- Works well with small datasets
- Fast training and prediction
- Coefficients explain feature importance

TRAINING APPROACH:
- Dynamic training: Model is trained on-the-fly with current database data
- Subject filtering: Optionally filter training data by subject for relevance
- Fallback mechanism: Uses rule-based pricing if insufficient data

Author: FMT Development Team
Date: December 2024
=============================================================================
"""

import logging
from typing import Dict, Any, Optional, List, Tuple
from decimal import Decimal

# Data Science imports
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# Django imports
from django.db import connection

# Configure logging
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION CONSTANTS
# =============================================================================

# Minimum number of samples required to train the model
MIN_TRAINING_SAMPLES = 10

# Fallback pricing parameters (used when insufficient training data)
BASE_RATE = 15.0           # Base hourly rate in dollars
RATE_PER_YEAR = 2.0        # Additional rate per year of experience
MAX_RATE = 150.0           # Maximum hourly rate cap
MIN_RATE = 10.0            # Minimum hourly rate floor

# Subject premium multipliers (certain subjects command higher rates)
SUBJECT_PREMIUMS = {
    'data science': 1.3,
    'machine learning': 1.35,
    'artificial intelligence': 1.4,
    'python programming': 1.2,
    'java programming': 1.2,
    'web development': 1.15,
    'calculus': 1.1,
    'statistics': 1.15,
    'physics': 1.1,
    'chemistry': 1.1,
    'sat prep': 1.2,
    'gre prep': 1.25,
    'gmat prep': 1.3,
}


class PricingPredictor:
    """
    Smart Pricing Engine using Linear Regression.
    
    This class predicts optimal hourly rates for tutors based on:
    1. Years of teaching experience
    2. Subject expertise
    3. Market data from existing tutors
    
    Attributes:
        model (LinearRegression): Scikit-learn linear regression model
        is_fitted (bool): Whether the model has been trained
        training_stats (dict): Statistics about the training data
    """
    
    def __init__(self):
        """Initialize the pricing predictor with a Linear Regression model."""
        # Initialize the Linear Regression model
        # LinearRegression uses Ordinary Least Squares (OLS) to find
        # the coefficients that minimize the sum of squared residuals
        self.model = LinearRegression()
        self.is_fitted = False
        self.training_stats = {}
    
    def fetch_training_data(
        self,
        subject_filter: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Fetch tutor data from database for training.
        
        Retrieves experience_years and hourly_rate from the tutors table.
        Optionally filters by subject for more relevant predictions.
        
        Args:
            subject_filter: Subject to filter tutors by (optional)
            
        Returns:
            DataFrame with experience_years and hourly_rate columns
        """
        try:
            # Base query to get tutor pricing data
            # Using LEFT JOIN in case profiles table is empty or not linked
            query = """
                SELECT 
                    t.experience_years,
                    t.hourly_rate,
                    t.qualifications,
                    t.average_rating
                FROM tutors t
                WHERE t.hourly_rate IS NOT NULL 
                  AND t.hourly_rate > 0
                  AND t.experience_years IS NOT NULL
                  AND t.experience_years >= 0
            """
            
            # Execute query
            with connection.cursor() as cursor:
                # First, let's debug by counting total tutors
                cursor.execute("SELECT COUNT(*) FROM tutors")
                total_count = cursor.fetchone()[0]
                logger.info(f"Total tutors in database: {total_count}")
                
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
            
            # Convert to DataFrame
            df = pd.DataFrame(rows, columns=columns)
            logger.info(f"Tutors with valid pricing data: {len(df)}")
            
            # Apply subject filter if specified
            if subject_filter and not df.empty:
                subject_lower = subject_filter.lower()
                
                # Filter tutors who teach the specified subject
                def has_subject(qualifications):
                    if not qualifications or not isinstance(qualifications, list):
                        return False
                    return any(
                        subject_lower in q.lower() 
                        for q in qualifications 
                        if isinstance(q, str)
                    )
                
                filtered_df = df[df['qualifications'].apply(has_subject)]
                
                # If we have enough filtered data, use it
                if len(filtered_df) >= MIN_TRAINING_SAMPLES:
                    df = filtered_df
                    logger.info(f"Filtered to {len(df)} tutors teaching '{subject_filter}'")
            
            logger.info(f"Fetched {len(df)} tutors for pricing model training")
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching training data: {str(e)}")
            return pd.DataFrame()
    
    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train the Linear Regression model on tutor data.
        
        LINEAR REGRESSION TRAINING PROCESS:
        1. Extract features (X) and target (y)
        2. Fit model to find optimal coefficients
        3. Calculate model performance metrics
        
        The model learns the relationship:
            hourly_rate = intercept + coefficient × experience_years
        
        Args:
            df: DataFrame with training data
            
        Returns:
            Dictionary with training statistics and model coefficients
        """
        if df.empty or len(df) < MIN_TRAINING_SAMPLES:
            logger.warning(f"Insufficient training data: {len(df)} samples")
            self.is_fitted = False
            return {
                'success': False,
                'reason': f'Insufficient data ({len(df)} samples, need {MIN_TRAINING_SAMPLES})'
            }
        
        try:
            # Prepare features (X) and target (y)
            # X = experience_years (independent variable)
            # y = hourly_rate (dependent variable we want to predict)
            X = df[['experience_years']].values  # 2D array for sklearn
            y = df['hourly_rate'].values         # 1D array of rates
            
            # Convert Decimal to float if necessary
            y = np.array([float(rate) for rate in y])
            
            # Split data for evaluation (80% train, 20% test)
            # This helps us evaluate model performance on unseen data
            if len(df) >= 20:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
            else:
                # Use all data for training if dataset is small
                X_train, X_test, y_train, y_test = X, X, y, y
            
            # =================================================================
            # FIT THE MODEL (This is where the magic happens!)
            # =================================================================
            # The fit() method finds the optimal β₀ (intercept) and β₁ (coefficient)
            # by minimizing: Σ(y_actual - y_predicted)²
            # 
            # Mathematically:
            #   β₁ = Σ(x - x̄)(y - ȳ) / Σ(x - x̄)²
            #   β₀ = ȳ - β₁x̄
            # =================================================================
            self.model.fit(X_train, y_train)
            self.is_fitted = True
            
            # Make predictions on test set
            y_pred = self.model.predict(X_test)
            
            # Calculate performance metrics
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            r2 = r2_score(y_test, y_pred)
            
            # Extract model coefficients
            # intercept_ = β₀ (base rate)
            # coef_[0] = β₁ (rate increase per year of experience)
            intercept = float(self.model.intercept_)
            coefficient = float(self.model.coef_[0])
            
            # Store training statistics
            self.training_stats = {
                'success': True,
                'samples_used': len(df),
                'intercept': round(intercept, 2),
                'coefficient': round(coefficient, 2),
                'r2_score': round(r2, 4),
                'rmse': round(rmse, 2),
                'mean_rate': round(float(y.mean()), 2),
                'min_rate': round(float(y.min()), 2),
                'max_rate': round(float(y.max()), 2),
                'interpretation': f"Base rate: ${intercept:.2f}, +${coefficient:.2f} per year of experience"
            }
            
            logger.info(f"Model trained: {self.training_stats['interpretation']}")
            logger.info(f"Model R² score: {r2:.4f} (1.0 = perfect fit)")
            
            return self.training_stats
            
        except Exception as e:
            logger.error(f"Model training error: {str(e)}")
            self.is_fitted = False
            return {
                'success': False,
                'reason': str(e)
            }
    
    def predict(self, experience_years: int) -> float:
        """
        Predict the optimal hourly rate for given experience.
        
        Uses the trained linear regression model:
            predicted_rate = intercept + coefficient × experience_years
        
        Args:
            experience_years: Years of teaching experience
            
        Returns:
            Predicted hourly rate (float)
        """
        if not self.is_fitted:
            raise ValueError("Model not trained. Call train() first.")
        
        # Ensure experience is valid
        experience_years = max(0, int(experience_years))
        
        # Make prediction
        # model.predict() expects a 2D array
        X_new = np.array([[experience_years]])
        predicted_rate = self.model.predict(X_new)[0]
        
        # Apply bounds to ensure reasonable rates
        predicted_rate = max(MIN_RATE, min(MAX_RATE, predicted_rate))
        
        return round(predicted_rate, 2)
    
    def predict_with_subject_premium(
        self,
        experience_years: int,
        subject: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Predict rate with subject-based premium adjustment.
        
        Some subjects command higher rates due to market demand.
        This method applies a multiplier based on subject.
        
        Args:
            experience_years: Years of teaching experience
            subject: Teaching subject (optional)
            
        Returns:
            Dictionary with base rate, premium, and final rate
        """
        # Get base prediction
        base_rate = self.predict(experience_years)
        
        # Calculate subject premium
        premium_multiplier = 1.0
        if subject:
            subject_lower = subject.lower()
            for key, multiplier in SUBJECT_PREMIUMS.items():
                if key in subject_lower or subject_lower in key:
                    premium_multiplier = multiplier
                    break
        
        # Apply premium
        final_rate = base_rate * premium_multiplier
        final_rate = max(MIN_RATE, min(MAX_RATE, final_rate))
        
        return {
            'base_rate': base_rate,
            'premium_multiplier': premium_multiplier,
            'final_rate': round(final_rate, 2),
            'subject': subject
        }


# =============================================================================
# FALLBACK PRICING FUNCTION
# =============================================================================

def calculate_fallback_rate(
    experience_years: int,
    subject: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calculate hourly rate using rule-based fallback.
    
    Used when insufficient training data is available.
    
    Formula:
        rate = BASE_RATE + (RATE_PER_YEAR × experience_years) × premium
    
    Args:
        experience_years: Years of teaching experience
        subject: Teaching subject (optional)
        
    Returns:
        Dictionary with calculated rate and explanation
    """
    experience_years = max(0, int(experience_years))
    
    # Base calculation
    base_rate = BASE_RATE + (RATE_PER_YEAR * experience_years)
    
    # Apply subject premium
    premium_multiplier = 1.0
    if subject:
        subject_lower = subject.lower()
        for key, multiplier in SUBJECT_PREMIUMS.items():
            if key in subject_lower or subject_lower in key:
                premium_multiplier = multiplier
                break
    
    # Calculate final rate
    final_rate = base_rate * premium_multiplier
    final_rate = max(MIN_RATE, min(MAX_RATE, final_rate))
    
    return {
        'suggested_rate': round(final_rate, 2),
        'base_rate': round(base_rate, 2),
        'premium_multiplier': premium_multiplier,
        'method': 'fallback_rule_based',
        'formula': f"${BASE_RATE} + (${RATE_PER_YEAR} × {experience_years} years) × {premium_multiplier}",
        'subject': subject
    }


# =============================================================================
# MAIN API FUNCTION
# =============================================================================

def predict_rate(
    experience_years: int,
    subject: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main entry point for price prediction.
    
    Attempts to use ML model, falls back to rule-based if insufficient data.
    
    WORKFLOW:
    1. Fetch training data from database
    2. If enough data: Train Linear Regression model → Predict
    3. If insufficient data: Use rule-based fallback formula
    
    Args:
        experience_years: Years of teaching experience
        subject: Teaching subject for filtering and premium calculation
        
    Returns:
        Dictionary containing:
        - suggested_rate: The predicted hourly rate
        - method: 'ml_linear_regression' or 'fallback_rule_based'
        - model_stats: Training statistics (if ML was used)
        - confidence: Confidence level of the prediction
    """
    try:
        # Validate input
        experience_years = max(0, int(experience_years))
        
        # Initialize predictor
        predictor = PricingPredictor()
        
        # Fetch training data (optionally filtered by subject)
        training_df = predictor.fetch_training_data(subject_filter=subject)
        
        # Attempt to train the model
        training_result = predictor.train(training_df)
        
        if training_result.get('success'):
            # Model trained successfully - use ML prediction
            prediction = predictor.predict_with_subject_premium(
                experience_years=experience_years,
                subject=subject
            )
            
            # Determine confidence based on R² score and sample size
            r2 = training_result.get('r2_score', 0)
            samples = training_result.get('samples_used', 0)
            
            if r2 > 0.7 and samples > 50:
                confidence = 'high'
            elif r2 > 0.4 and samples > 20:
                confidence = 'medium'
            else:
                confidence = 'low'
            
            return {
                'suggested_rate': prediction['final_rate'],
                'base_rate': prediction['base_rate'],
                'premium_multiplier': prediction['premium_multiplier'],
                'method': 'ml_linear_regression',
                'confidence': confidence,
                'model_stats': training_result,
                'input': {
                    'experience_years': experience_years,
                    'subject': subject
                }
            }
        else:
            # Insufficient data - use fallback
            fallback_result = calculate_fallback_rate(
                experience_years=experience_years,
                subject=subject
            )
            
            return {
                'suggested_rate': fallback_result['suggested_rate'],
                'base_rate': fallback_result['base_rate'],
                'premium_multiplier': fallback_result['premium_multiplier'],
                'method': 'fallback_rule_based',
                'confidence': 'low',
                'reason': training_result.get('reason', 'Insufficient training data'),
                'formula': fallback_result['formula'],
                'input': {
                    'experience_years': experience_years,
                    'subject': subject
                }
            }
            
    except Exception as e:
        logger.error(f"Price prediction error: {str(e)}")
        
        # Emergency fallback
        fallback = calculate_fallback_rate(experience_years, subject)
        return {
            'suggested_rate': fallback['suggested_rate'],
            'method': 'emergency_fallback',
            'confidence': 'low',
            'error': str(e),
            'input': {
                'experience_years': experience_years,
                'subject': subject
            }
        }


def get_market_analysis(subject: Optional[str] = None) -> Dict[str, Any]:
    """
    Get market analysis for tutor pricing.
    
    Provides statistics about current market rates.
    
    Args:
        subject: Optional subject filter
        
    Returns:
        Market statistics dictionary
    """
    try:
        predictor = PricingPredictor()
        df = predictor.fetch_training_data(subject_filter=subject)
        
        if df.empty:
            return {
                'status': 'no_data',
                'message': 'No pricing data available'
            }
        
        rates = df['hourly_rate'].apply(float)
        experience = df['experience_years']
        
        return {
            'status': 'success',
            'subject_filter': subject,
            'sample_size': len(df),
            'rate_statistics': {
                'mean': round(rates.mean(), 2),
                'median': round(rates.median(), 2),
                'min': round(rates.min(), 2),
                'max': round(rates.max(), 2),
                'std': round(rates.std(), 2)
            },
            'experience_statistics': {
                'mean': round(experience.mean(), 1),
                'min': int(experience.min()),
                'max': int(experience.max())
            },
            'percentiles': {
                '25th': round(rates.quantile(0.25), 2),
                '50th': round(rates.quantile(0.50), 2),
                '75th': round(rates.quantile(0.75), 2),
                '90th': round(rates.quantile(0.90), 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Market analysis error: {str(e)}")
        return {
            'status': 'error',
            'error': str(e)
        }
