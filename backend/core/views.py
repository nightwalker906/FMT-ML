"""
API Views for Find My Tutor

=============================================================================
RATE LIMITING (THROTTLING) DOCUMENTATION
=============================================================================
This module implements API rate limiting to:
1. Protect external AI service usage
2. Prevent abuse and DDoS attacks
3. Ensure fair usage across all users

Throttle Scopes:
- 'generative_ai': 10/day - Strict limit for LLM endpoints
- 'ml_prediction': 50/day - ML model endpoints
- 'sentiment': 100/day - NLP analysis endpoints
- 'anon': 100/day - Default for anonymous users
- 'user': 1000/day - Default for authenticated users
=============================================================================
"""
import logging
import hashlib
import json
from django.core.cache import cache
from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, action, throttle_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import (
    AnonRateThrottle, 
    UserRateThrottle, 
    ScopedRateThrottle
)
from django.db.models import Q, Avg, Prefetch
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from .models import Profile, Student, Tutor, Subject, Session, Rating
from .serializers import (
    ProfileSerializer, StudentSerializer, TutorSerializer,
    SubjectSerializer, SessionSerializer, RatingSerializer
)

# Configure logging
logger = logging.getLogger(__name__)


# =============================================================================
# CUSTOM THROTTLE CLASSES
# =============================================================================

class GenerativeAIThrottle(ScopedRateThrottle):
    """
    Strict throttle for Generative AI endpoints (Free LLM services).
    Protects against overuse of free AI service quotas.
    Rate: 10 requests/day per user
    """
    scope = 'generative_ai'


class MLPredictionThrottle(ScopedRateThrottle):
    """
    Throttle for ML prediction endpoints (recommendations, pricing).
    More lenient since these run locally without external API costs.
    Rate: 50 requests/day per user
    """
    scope = 'ml_prediction'


class SentimentAnalysisThrottle(ScopedRateThrottle):
    """
    Throttle for sentiment analysis endpoints.
    Uses local TextBlob, so can be more generous.
    Rate: 100 requests/day per user
    """
    scope = 'sentiment'


class ProfileViewSet(viewsets.ModelViewSet):
    """
    API endpoint for user profiles.
    """
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'user_type']
    ordering_fields = ['created_at', 'first_name']
    ordering = ['-created_at']
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def tutors(self, request):
        """Get all tutors"""
        tutors = Profile.objects.filter(user_type='tutor')
        serializer = self.get_serializer(tutors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def students(self, request):
        """Get all students"""
        students = Profile.objects.filter(user_type='student')
        serializer = self.get_serializer(students, many=True)
        return Response(serializer.data)


class StudentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for student profiles with learning preferences.
    """
    queryset = Student.objects.select_related('profile')
    serializer_class = StudentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['profile__first_name', 'profile__last_name', 'grade_level']
    ordering_fields = ['created_at', 'grade_level']
    ordering = ['-created_at']
    permission_classes = [AllowAny]


class TutorViewSet(viewsets.ModelViewSet):
    """
    API endpoint for tutor profiles with qualifications and availability.
    """
    queryset = Tutor.objects.select_related('profile')
    serializer_class = TutorSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['profile__first_name', 'profile__last_name', 'qualifications']
    ordering_fields = ['created_at', 'hourly_rate', 'experience_years']
    ordering = ['hourly_rate']
    permission_classes = [AllowAny]

    @action(detail=True, methods=['get'])
    def rating(self, request, pk=None):
        """Get average rating for a tutor"""
        tutor = self.get_object()
        ratings = Rating.objects.filter(tutor=tutor)
        avg_rating = ratings.aggregate(Avg('rating'))['rating__avg']
        count = ratings.count()
        
        return Response({
            'tutor_id': pk,
            'average_rating': avg_rating,
            'total_ratings': count,
        })


class SubjectViewSet(viewsets.ModelViewSet):
    """
    API endpoint for subjects.
    """
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'category']
    ordering_fields = ['name', 'category']
    ordering = ['name']
    permission_classes = [AllowAny]


class SessionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for tutoring sessions.
    """
    queryset = Session.objects.select_related('student', 'tutor', 'subject')
    serializer_class = SessionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['status', 'student__profile__first_name', 'tutor__profile__first_name']
    ordering_fields = ['created_at', 'scheduled_at', 'status']
    ordering = ['-scheduled_at']
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Filter sessions by status"""
        status_filter = request.query_params.get('status')
        if not status_filter:
            return Response({'error': 'status parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        sessions = Session.objects.filter(status=status_filter)
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_sessions(self, request):
        """Get sessions for logged-in user (student or tutor)"""
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # This would filter by the logged-in user's profile
        # For now, return empty since we need proper authentication setup
        return Response([])


class RatingViewSet(viewsets.ModelViewSet):
    """
    API endpoint for tutor ratings/reviews.
    """
    queryset = Rating.objects.select_related('student', 'tutor', 'session')
    serializer_class = RatingSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['tutor__profile__first_name', 'student__profile__first_name']
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def by_tutor(self, request):
        """Get all ratings for a specific tutor"""
        tutor_id = request.query_params.get('tutor_id')
        if not tutor_id:
            return Response({'error': 'tutor_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        ratings = Rating.objects.filter(tutor_id=tutor_id)
        serializer = self.get_serializer(ratings, many=True)
        return Response(serializer.data)


# =============================================================================
# ML-POWERED RECOMMENDATION ENDPOINT
# =============================================================================

@swagger_auto_schema(
    method='get',
    operation_description="Get AI-powered tutor recommendations for the student dashboard based on top-rated tutors.",
    responses={
        200: openapi.Response(
            description="Successful smart recommendations",
            examples={
                "application/json": {
                    "status": "success",
                    "data": [
                        {
                            "id": "uuid",
                            "full_name": "Sarah Jones",
                            "subjects": ["Math", "Physics"],
                            "match_percentage": 94.5,
                            "similarity_score": 0.945,
                            "explanation": "Sarah specializes in Calculus...", 
                            "is_online": True,
                            "average_rating": 4.9,
                            "hourly_rate": 45.0,
                            "image": "https://ui-avatars.com/api/..."
                        }
                    ]
                }
            }
        )
    }
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_smart_recommendations(request):
    """
    Smart Recommendations Endpoint for Student Dashboard
    
    🔓 PUBLIC ACCESS: No authentication required
    ⚠️ RATE LIMITED: 50 requests/day (ML prediction scope)
    
    Returns smart AI-powered tutor recommendations based on:
    - Student's learning goals (from database)
    - Popular/top-rated tutors
    - Content-Based Filtering with ML
    
    Response:
    {
        "status": "success",
        "data": [
            {
                "id": "101",
                "full_name": "Sarah Jones",
                "subjects": ["Math", "Physics"],
                "match_percentage": 94.5,
                "similarity_score": 0.945,
                "explanation": "Sarah specializes in Calculus, which matches your search...", 
                "is_online": true,
                "average_rating": 4.9,
                "hourly_rate": 45.0,
                "image": "https://i.pravatar.cc/150?u=101"
            }
        ]
    }
    """
    try:
        from django.db.models import Q, Avg
        from .recommender import get_recommendations
        
        # ── Response-level cache (60s) keyed by student_id ──────────────
        student_id = request.query_params.get('student_id')
        cache_key = f"smart_recs_{student_id or 'anon'}"
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(f"[SmartRecs] Cache HIT for key={cache_key}")
            return Response(cached, status=status.HTTP_200_OK)

        learning_goals_text = None
        
        if student_id:
            try:
                student = Student.objects.select_related('profile').get(profile_id=student_id)
                if student.learning_goals:
                    # Combine learning goals into a single query string
                    if isinstance(student.learning_goals, list):
                        learning_goals_text = ' '.join(student.learning_goals)
                    else:
                        learning_goals_text = str(student.learning_goals)
                logger.info(f"Found student learning goals: {learning_goals_text}")
            except Student.DoesNotExist:
                logger.warning(f"Student not found: {student_id}")
                pass
        
        # If we have learning goals, use ML recommender; otherwise use top-rated
        if learning_goals_text:
            # Use ML-powered recommendation based on learning goals
            logger.info(f"Using ML recommender with query: {learning_goals_text}")
            results = get_recommendations(
                query=learning_goals_text,
                max_price=None,
                top_n=10
            )
            
            recommendations = []
            for result in results:
                # Extract explanation summary if it's an object
                explanation = result.get('explanation', {})
                if isinstance(explanation, dict):
                    explanation_text = explanation.get('summary', 'Recommended based on your goals')
                else:
                    explanation_text = str(explanation)
                
                recommendation = {
                    "id": str(result.get('id')),
                    "full_name": result.get('full_name', 'Unknown'),
                    "subjects": result.get('subjects', []),
                    "match_percentage": int(result.get('match_percentage', 0)),
                    "similarity_score": round(float(result.get('similarity_score', 0)), 3),
                    "explanation": explanation_text,
                    "is_online": result.get('is_online', False),
                    "average_rating": float(result.get('average_rating', 0)),
                    "hourly_rate": float(result.get('hourly_rate', 0)),
                    "image": result.get('image', f"https://ui-avatars.com/api/?name={result.get('full_name', 'Tutor')}")
                }
                recommendations.append(recommendation)
        else:
            # Fall back to top-rated tutors (optimized with prefetch)
            tutors = Tutor.objects.select_related(
                'profile'
            ).prefetch_related(
                'subjects'
            ).annotate(
                avg_rating=Avg('ratings__rating')
            ).filter(
                avg_rating__gte=4.0
            ).order_by('-avg_rating')[:10]
            
            recommendations = []
            
            for i, tutor in enumerate(tutors):
                profile = tutor.profile
                subjects = [s.name for s in tutor.subjects.all()]
                
                # Calculate match percentage based on rating and availability
                match_percentage = min(99, int((profile.average_rating or 0) * 10))
                
                recommendation = {
                    "id": str(profile.id),
                    "full_name": f"{profile.first_name} {profile.last_name}".strip(),
                    "subjects": subjects,
                    "match_percentage": match_percentage,
                    "similarity_score": round(profile.average_rating / 5.0, 3) if profile.average_rating else 0,
                    "explanation": f"{profile.first_name} is an excellent tutor with a {profile.average_rating or 0:.1f}/5 rating. Specializes in {', '.join(subjects[:2]) if subjects else 'multiple subjects'}.",
                    "is_online": getattr(profile, 'is_online', False),
                    "average_rating": profile.average_rating or 0,
                    "hourly_rate": tutor.hourly_rate or 0,
                    "image": f"https://ui-avatars.com/api/?name={profile.first_name}+{profile.last_name}&background=0d9488&color=fff"
                }
                
                recommendations.append(recommendation)
        
        # If no recommendations available, return empty list with helpful message
        if not recommendations:
            logger.info("No recommendations available, returning empty with guidance")
            return Response({
                "status": "success",
                "data": [],
                "message": "No top picks available yet. Try adjusting your learning goals or searching for specific subjects to get personalized recommendations!"
            }, status=status.HTTP_200_OK)
        
        response_data = {
            "status": "success",
            "data": recommendations
        }
        
        # Cache the response for 60 seconds
        cache.set(cache_key, response_data, timeout=60)
        logger.info(f"[SmartRecs] Cache SET for key={cache_key} ({len(recommendations)} results)")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Smart recommendations error: {str(e)}")
        return Response({
            "status": "success",
            "data": [],  # Return empty list on error to prevent frontend crash
            "message": "Unable to load recommendations. Try adjusting your learning goals or searching for specific subjects!"
        }, status=status.HTTP_200_OK)


@swagger_auto_schema(
    method='post',
    operation_description="Uses Content-Based Filtering with TF-IDF and Cosine Similarity to match students with the most relevant tutors.",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['query'],
        properties={
            'query': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Describe what you need help with',
                example='I need help with Calculus and Algebra'
            ),
            'max_price': openapi.Schema(
                type=openapi.TYPE_NUMBER,
                description='Maximum hourly rate (optional)',
                example=100
            ),
            'limit': openapi.Schema(
                type=openapi.TYPE_INTEGER,
                description='Number of tutors to return (optional, default 10)',
                example=10
            ),
        },
        example={
            "query": "I need help with Calculus and Algebra",
            "max_price": 100,
            "limit": 10
        }
    ),
    responses={
        200: openapi.Response(
            description="Successful tutor recommendations",
            examples={
                "application/json": {
                    "status": "success",
                    "query": "I need help with Calculus and Algebra",
                    "count": 2,
                    "results": [
                        {
                            "id": "uuid",
                            "full_name": "John Doe",
                            "subjects": ["Calculus", "Algebra"],
                            "hourly_rate": 50.0,
                            "average_rating": 4.8,
                            "similarity_score": 0.8543,
                            "match_percentage": 85.4
                        }
                    ]
                }
            }
        ),
        400: "Bad Request - Query parameter is required"
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([MLPredictionThrottle])
def recommend_tutors(request):
    """
    Smart Recommendations Endpoint for Student Dashboard
    
    🔓 PUBLIC ACCESS: No authentication required
    ⚠️ RATE LIMITED: 50 requests/day (ML prediction scope)
    
    Returns smart AI-powered tutor recommendations based on:
    - Student's learning goals (if available)
    - Popular/top-rated tutors
    - Recent search history (if authenticated)
    
    Response:
    {
        "status": "success",
        "data": [
            {
                "id": "101",
                "full_name": "Sarah Jones",
                "subjects": ["Math", "Physics"],
                "match_percentage": 94.5,
                "similarity_score": 0.945,
                "explanation": "Sarah specializes in Calculus, which matches your search...", 
                "is_online": true,
                "average_rating": 4.9,
                "hourly_rate": 45.0,
                "image": "https://i.pravatar.cc/150?u=101"
            }
        ]
    }
    """
    try:
        from django.db.models import Q, Avg
        from .recommender import get_recommendations
        
        data = request.data
        query = data.get('query', '').strip()
        max_price = data.get('max_price')
        limit = data.get('limit', 10)
        
        try:
            limit = max(1, min(50, int(limit)))
        except (ValueError, TypeError):
            limit = 10
        
        if max_price is not None:
            try:
                max_price = float(max_price)
            except (ValueError, TypeError):
                max_price = None
        
        # ── Response-level cache (60s) keyed by query ──
        query_hash = hashlib.md5(f"{query}_{max_price}_{limit}".encode()).hexdigest()[:16]
        cache_key = f"recommend_{query_hash}"
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(f"[Recommend] Cache HIT for key={cache_key}")
            return Response(cached, status=status.HTTP_200_OK)
        
        if query:
            # Use ML-powered recommendation based on query
            logger.info(f"Using ML recommender with query: {query}")
            results = get_recommendations(
                query=query,
                max_price=max_price,
                top_n=limit
            )
            
            recommendations = []
            for result in results:
                explanation = result.get('explanation', {})
                if isinstance(explanation, dict):
                    explanation_text = explanation.get('summary', 'Recommended based on your query')
                else:
                    explanation_text = str(explanation)
                
                recommendation = {
                    "id": str(result.get('id')),
                    "full_name": result.get('full_name', 'Unknown'),
                    "subjects": result.get('subjects', []),
                    "match_percentage": int(result.get('match_percentage', 0)),
                    "similarity_score": round(float(result.get('similarity_score', 0)), 3),
                    "explanation": explanation_text,
                    "is_online": result.get('is_online', False),
                    "average_rating": float(result.get('average_rating', 0)),
                    "hourly_rate": float(result.get('hourly_rate', 0)),
                    "image": result.get('image', f"https://ui-avatars.com/api/?name={result.get('full_name', 'Tutor')}")
                }
                recommendations.append(recommendation)
        else:
            # Fall back to top-rated tutors
            tutors = Tutor.objects.select_related('profile').order_by('-average_rating')[:limit]
            
            recommendations = []
            for tutor in tutors:
                profile = tutor.profile
                subjects = list(tutor.qualifications) if isinstance(tutor.qualifications, list) else []
                match_percentage = min(99, int((tutor.average_rating or 0) * 10))
                
                recommendation = {
                    "id": str(profile.id),
                    "full_name": f"{profile.first_name} {profile.last_name}".strip(),
                    "subjects": subjects,
                    "match_percentage": match_percentage,
                    "similarity_score": round(float(tutor.average_rating or 0) / 5.0, 3),
                    "explanation": f"{profile.first_name} is a top-rated tutor with a {tutor.average_rating or 0:.1f}/5 rating.",
                    "is_online": getattr(profile, 'is_online', False),
                    "average_rating": float(tutor.average_rating or 0),
                    "hourly_rate": float(tutor.hourly_rate or 0),
                    "image": f"https://ui-avatars.com/api/?name={profile.first_name}+{profile.last_name}&background=0d9488&color=fff"
                }
                recommendations.append(recommendation)
        
        response_data = {
            "status": "success",
            "query": query or None,
            "count": len(recommendations),
            "data": recommendations
        }
        
        cache.set(cache_key, response_data, timeout=60)
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Smart recommendations error: {str(e)}")
        return Response({
            "status": "success",
            "data": []  # Return empty list on error to prevent frontend crash
        }, status=status.HTTP_200_OK)



@api_view(['GET'])
@permission_classes([AllowAny])
def recommendation_health(request):
    """
    Health check endpoint for the recommendation system.
    
    🔓 PUBLIC ACCESS: No authentication required
    
    Returns system status and basic statistics.
    """
    try:
        from django.db import connection
        
        # Count tutors in database
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM tutors")
            tutor_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM students")
            student_count = cursor.fetchone()[0]
        
        return Response({
            'status': 'healthy',
            'service': 'FMT Recommendation Engine',
            'algorithm': 'Content-Based Filtering (TF-IDF + Cosine Similarity)',
            'statistics': {
                'total_tutors': tutor_count,
                'total_students': student_count
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# SENTIMENT ANALYSIS ENDPOINTS
# =============================================================================

@swagger_auto_schema(
    method='post',
    operation_description="Analyze the sentiment of a review comment. Returns polarity score and sentiment label.",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['comment'],
        properties={
            'comment': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='The review comment text to analyze'
            ),
            'detailed': openapi.Schema(
                type=openapi.TYPE_BOOLEAN,
                description='Whether to return detailed analysis (default: false)',
                default=False
            ),
        },
        example={
            "comment": "This tutor was amazing! Very helpful and patient.",
            "detailed": False
        }
    ),
    responses={
        200: openapi.Response(
            description="Successful sentiment analysis",
            examples={
                "application/json": {
                    "status": "success",
                    "original_text": "This tutor was amazing! Very helpful and patient.",
                    "polarity_score": 0.65,
                    "subjectivity_score": 0.8,
                    "sentiment_label": "Positive",
                    "confidence": "High",
                    "word_count": 8
                }
            }
        ),
        400: "Bad Request - Comment text is required"
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([SentimentAnalysisThrottle])
def analyze_review(request):
    """
    Sentiment Analysis Endpoint for Review Comments
    
    🔓 PUBLIC ACCESS: No authentication required
    ⚠️ RATE LIMITED: 100 requests/day (sentiment scope)
    
    Analyzes the sentiment of a review comment before it's saved to the database.
    Uses TextBlob NLP to classify sentiment as Positive, Neutral, or Negative.
    
    Request Body (JSON):
    {
        "comment": "This tutor was amazing! Very helpful and patient.",
        "detailed": false  // optional, default false
    }
    
    Response:
    {
        "status": "success",
        "sentiment_label": "Positive",
        "polarity_score": 0.65,
        "subjectivity_score": 0.8,
        "confidence": "High",
        "word_count": 8
    }
    
    Use Cases:
    - Auto-tag reviews before saving
    - Content moderation
    - Tutor feedback analysis
    """
    try:
        data = request.data
        
        # Validate comment parameter
        comment = data.get('comment', '').strip()
        if not comment:
            return Response({
                'status': 'error',
                'message': 'Comment text is required. Please provide the review text to analyze.',
                'sentiment_label': None,
                'polarity_score': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if detailed analysis is requested
        detailed = data.get('detailed', False)
        
        # ── Response-level cache (10 min) keyed by comment hash ──
        comment_hash = hashlib.md5(comment.encode()).hexdigest()
        cache_key = f"sentiment_{'det' if detailed else 'std'}_{comment_hash}"
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(f"[Sentiment] Cache HIT for key={cache_key}")
            return Response(cached, status=status.HTTP_200_OK)
        
        # Import sentiment analysis module
        from .sentiment import analyze_sentiment, analyze_sentiment_detailed
        
        # Perform analysis
        if detailed:
            result = analyze_sentiment_detailed(comment)
        else:
            result = analyze_sentiment(comment)
        
        # Check for errors in analysis
        if 'error' in result and result.get('word_count', 0) == 0:
            return Response({
                'status': 'error',
                'message': result.get('error', 'Analysis failed'),
                'sentiment_label': result.get('sentiment_label'),
                'polarity_score': result.get('polarity_score')
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Sentiment analysis completed: {result.get('sentiment_label')} ({result.get('polarity_score')})")
        
        response_data = {
            'status': 'success',
            'original_text': comment[:200] + '...' if len(comment) > 200 else comment,
            **result
        }
        
        cache.set(cache_key, response_data, timeout=600)
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Sentiment analysis error: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'An error occurred during sentiment analysis: {str(e)}',
            'sentiment_label': None,
            'polarity_score': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_description="Batch Sentiment Analysis for Multiple Reviews. Analyzes multiple review comments in a single request.",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['comments'],
        properties={
            'comments': openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(type=openapi.TYPE_STRING),
                description='List of review comments to analyze'
            ),
        },
        example={
            "comments": [
                "Great tutor! Very helpful and patient.",
                "Terrible experience, would not recommend.",
                "Average session, nothing special."
            ]
        }
    ),
    responses={
        200: openapi.Response(
            description="Successful analysis",
            examples={
                "application/json": {
                    "status": "success",
                    "total_analyzed": 3,
                    "results": [
                        {"polarity_score": 0.65, "sentiment_label": "Positive"},
                        {"polarity_score": -0.45, "sentiment_label": "Negative"},
                        {"polarity_score": 0.0, "sentiment_label": "Neutral"}
                    ],
                    "summary": {
                        "average_polarity": 0.07,
                        "distribution": {"positive": 1, "neutral": 1, "negative": 1}
                    }
                }
            }
        ),
        400: "Bad Request - Invalid or empty comments array"
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def analyze_reviews_batch(request):
    """
    Batch Sentiment Analysis for Multiple Reviews
    
    🔓 PUBLIC ACCESS: No authentication required
    
    Analyzes multiple review comments in a single request.
    Useful for bulk processing or generating summary reports.
    
    Request Body (JSON):
    {
        "comments": [
            "Great tutor! Very helpful.",
            "Not satisfied with the session.",
            "Average experience, nothing special."
        ]
    }
    
    Response:
    {
        "status": "success",
        "total_analyzed": 3,
        "results": [...],
        "summary": {
            "average_polarity": 0.15,
            "distribution": {"positive": 1, "neutral": 1, "negative": 1}
        }
    }
    """
    try:
        data = request.data
        
        # Validate comments parameter
        comments = data.get('comments', [])
        if not comments or not isinstance(comments, list):
            return Response({
                'status': 'error',
                'message': 'Comments array is required. Please provide a list of review texts.',
                'results': []
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Limit batch size to prevent abuse
        max_batch_size = 100
        if len(comments) > max_batch_size:
            return Response({
                'status': 'error',
                'message': f'Batch size exceeds maximum of {max_batch_size}. Please send fewer comments.',
                'results': []
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Import sentiment analysis module
        from .sentiment import batch_analyze_sentiments, get_sentiment_summary
        
        # Filter out empty comments
        valid_comments = [c.strip() for c in comments if c and isinstance(c, str) and c.strip()]
        
        if not valid_comments:
            return Response({
                'status': 'error',
                'message': 'No valid comments provided.',
                'results': []
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Perform batch analysis
        results = batch_analyze_sentiments(valid_comments)
        summary = get_sentiment_summary(valid_comments)
        
        logger.info(f"Batch sentiment analysis completed: {len(valid_comments)} reviews")
        
        return Response({
            'status': 'success',
            'total_analyzed': len(valid_comments),
            'results': results,
            'summary': summary
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Batch sentiment analysis error: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'An error occurred during batch analysis: {str(e)}',
            'results': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def analyze_tutor_sentiment(request, tutor_id):
    """
    Analyze Sentiment of All Reviews for a Specific Tutor
    
    🔓 PUBLIC ACCESS: No authentication required
    
    Fetches all reviews for a tutor and provides sentiment summary.
    Useful for tutor performance dashboards.
    
    URL: GET /api/tutor/{tutor_id}/sentiment/
    
    Response:
    {
        "status": "success",
        "tutor_id": "uuid",
        "total_reviews": 25,
        "average_polarity": 0.45,
        "overall_sentiment": "Positive",
        "distribution": {"positive": 18, "neutral": 5, "negative": 2}
    }
    """
    try:
        if not tutor_id:
            return Response({
                'status': 'error',
                'message': 'Tutor ID is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Import sentiment analysis module
        from .sentiment import analyze_tutor_reviews
        
        # Perform analysis
        result = analyze_tutor_reviews(tutor_id)
        
        if 'error' in result:
            return Response({
                'status': 'error',
                'message': result.get('error'),
                'tutor_id': tutor_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.info(f"Tutor sentiment analysis completed for {tutor_id}")
        
        return Response({
            'status': 'success',
            **result
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Tutor sentiment analysis error: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'An error occurred: {str(e)}',
            'tutor_id': tutor_id
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# SMART PRICING ENDPOINTS (Predictive Analytics)
# =============================================================================

@swagger_auto_schema(
    method='post',
    operation_description="Uses Linear Regression to predict optimal hourly rates for tutors based on experience and subject expertise.",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['experience'],
        properties={
            'experience': openapi.Schema(
                type=openapi.TYPE_INTEGER,
                description='Years of teaching experience',
                example=5
            ),
            'subject': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Subject for premium calculation (optional)',
                example='Mathematics'
            ),
        },
        example={
            "experience": 5,
            "subject": "Mathematics"
        }
    ),
    responses={
        200: openapi.Response(
            description="Successful price prediction",
            examples={
                "application/json": {
                    "status": "success",
                    "suggested_price": 35.50,
                    "method": "ml_linear_regression",
                    "confidence": "high",
                    "model_stats": {
                        "r2_score": 0.85,
                        "samples_used": 150
                    }
                }
            }
        ),
        400: "Bad Request - Experience (years) is required"
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([MLPredictionThrottle])
def predict_price(request):
    """
    Smart Pricing Prediction Endpoint
    
    🔓 PUBLIC ACCESS: No authentication required
    ⚠️ RATE LIMITED: 50 requests/day (ML prediction scope)
    
    Uses Linear Regression to predict optimal hourly rates for tutors
    based on experience and subject expertise.
    
    Request Body (JSON):
    {
        "experience": 5,           // Years of teaching experience
        "subject": "Mathematics"   // Optional: Subject for premium calculation
    }
    
    Response:
    {
        "status": "success",
        "suggested_price": 35.50,
        "method": "ml_linear_regression",
        "confidence": "high",
        "model_stats": {
            "r2_score": 0.85,
            "samples_used": 150
        }
    }
    
    Algorithm:
    - Uses Linear Regression: price = β₀ + β₁ × experience_years
    - Falls back to rule-based pricing if insufficient training data
    """
    try:
        data = request.data
        
        # Validate experience parameter
        experience = data.get('experience')
        if experience is None:
            return Response({
                'status': 'error',
                'message': 'Experience (years) is required.',
                'suggested_price': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            experience = int(experience)
            if experience < 0:
                experience = 0
        except (ValueError, TypeError):
            return Response({
                'status': 'error',
                'message': 'Experience must be a valid number.',
                'suggested_price': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Optional subject parameter
        subject = data.get('subject', '').strip() or None
        
        # ── Response-level cache (5 min) keyed by experience+subject ──
        cache_key = f"price_pred_{experience}_{subject or 'all'}"
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(f"[PricePredict] Cache HIT for key={cache_key}")
            return Response(cached, status=status.HTTP_200_OK)
        
        # Import and call pricing module
        from .pricing import predict_rate
        
        logger.info(f"Price prediction request: experience={experience}, subject={subject}")
        
        # Get prediction
        result = predict_rate(
            experience_years=experience,
            subject=subject
        )
        
        response_data = {
            'status': 'success',
            'suggested_price': result.get('suggested_rate'),
            'base_rate': result.get('base_rate'),
            'premium_multiplier': result.get('premium_multiplier', 1.0),
            'method': result.get('method'),
            'confidence': result.get('confidence'),
            'model_stats': result.get('model_stats'),
            'input': result.get('input')
        }
        
        cache.set(cache_key, response_data, timeout=300)
        logger.info(f"[PricePredict] Cache SET for key={cache_key}")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Price prediction error: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'An error occurred: {str(e)}',
            'suggested_price': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def market_analysis(request):
    """
    Market Analysis Endpoint
    
    🔓 PUBLIC ACCESS: No authentication required
    
    Provides statistics about current tutor pricing in the market.
    
    Query Parameters:
    - subject: Optional filter by subject
    
    Response includes rate statistics, percentiles, and experience data.
    """
    try:
        subject = request.query_params.get('subject')
        
        # ── Response-level cache (10 min) ──
        cache_key = f"market_analysis_{subject or 'all'}"
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(f"[MarketAnalysis] Cache HIT for key={cache_key}")
            return Response(cached, status=status.HTTP_200_OK)
        
        from .pricing import get_market_analysis
        
        result = get_market_analysis(subject=subject)
        
        cache.set(cache_key, result, timeout=600)
        logger.info(f"[MarketAnalysis] Cache SET for key={cache_key}")
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Market analysis error: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def debug_db_check(request):
    """
    Debug endpoint to check database connection and tutor data.
    Only available when DEBUG=True.
    """
    from django.conf import settings as django_settings
    if not django_settings.DEBUG:
        return Response(
            {'status': 'error', 'message': 'Debug endpoint disabled in production.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    from django.db import connection
    
    try:
        with connection.cursor() as cursor:
            # Check total tutors
            cursor.execute("SELECT COUNT(*) FROM tutors")
            total_tutors = cursor.fetchone()[0]
            
            # Check tutors with pricing data
            cursor.execute("""
                SELECT COUNT(*) FROM tutors 
                WHERE hourly_rate IS NOT NULL 
                  AND hourly_rate > 0 
                  AND experience_years IS NOT NULL
            """)
            tutors_with_pricing = cursor.fetchone()[0]
            
            # Get sample data
            cursor.execute("""
                SELECT experience_years, hourly_rate, qualifications 
                FROM tutors 
                LIMIT 5
            """)
            sample_data = cursor.fetchall()
            
        return Response({
            'status': 'success',
            'database_connected': True,
            'total_tutors': total_tutors,
            'tutors_with_valid_pricing': tutors_with_pricing,
            'sample_data': [
                {
                    'experience_years': row[0],
                    'hourly_rate': float(row[1]) if row[1] else None,
                    'qualifications': row[2]
                }
                for row in sample_data
            ]
        })
        
    except Exception as e:
        return Response({
            'status': 'error',
            'database_connected': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# AI STUDY PLANNER ENDPOINTS (Generative AI)
# =============================================================================

@swagger_auto_schema(
    method='post',
    operation_description="Uses free AI services (Ollama or Hugging Face) to create personalized study plans. Rate limited to 10 requests/day.",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['goal', 'weakness'],
        properties={
            'goal': openapi.Schema(
                type=openapi.TYPE_STRING,
                description="Student's learning goal"
            ),
            'weakness': openapi.Schema(
                type=openapi.TYPE_STRING,
                description="Weak areas to focus on"
            ),
            'weeks': openapi.Schema(
                type=openapi.TYPE_INTEGER,
                description='Duration in weeks (default: 4)',
                default=4
            ),
            'context': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Additional context about the student'
            ),
        },
        example={
            "goal": "Pass Calculus Final Exam",
            "weakness": "Integrals and Limits",
            "weeks": 4,
            "context": "College freshman, limited time"
        }
    ),
    responses={
        200: openapi.Response(
            description="Successful study plan generation",
            examples={
                "application/json": {
                    "status": "success",
                    "plan": [
                        {
                            "week": 1,
                            "theme": "Foundation Building",
                            "topic": "Understanding Integration Basics",
                            "learning_objectives": ["..."],
                            "action_items": ["..."],
                            "milestone": "Complete basic problems"
                        }
                    ],
                    "ai_generated": True,
                    "service": "ollama"
                }
            }
        ),
        400: "Bad Request - Goal and weakness are required",
        429: "Rate limit exceeded (10/day)"
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([GenerativeAIThrottle])
def generate_plan(request):
    """
    AI Study Planner Endpoint
    
    🔓 PUBLIC ACCESS: No authentication required
    ⚠️ RATE LIMITED: 10 requests/day
    
    Uses free AI services (Ollama or Hugging Face) to create personalized study plans.
    """
    try:
        data = request.data
        
        # Validate required parameters
        goal = data.get('goal', '').strip()
        if not goal:
            return Response({
                'status': 'error',
                'message': 'Goal is required. What do you want to achieve?',
                'plan': []
            }, status=status.HTTP_400_BAD_REQUEST)
        
        weakness = data.get('weakness', '').strip()
        if not weakness:
            return Response({
                'status': 'error',
                'message': 'Weakness/weak areas is required. What topics need improvement?',
                'plan': []
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Optional parameters
        weeks = data.get('weeks', 4)
        try:
            weeks = int(weeks)
            weeks = max(1, min(12, weeks))  # Clamp between 1-12 weeks
        except (ValueError, TypeError):
            weeks = 4
        
        context = data.get('context', '').strip() or None
        
        # Import and call study planner module
        from .study_planner import generate_study_plan
        
        logger.info(f"Study plan request: goal='{goal}', weakness='{weakness}', weeks={weeks}")
        
        # Generate plan
        result = generate_study_plan(
            student_goal=goal,
            weak_areas=weakness,
            duration_weeks=weeks,
            additional_context=context
        )
        
        return Response({
            'status': result.get('status', 'success'),
            'message': result.get('message', 'Study plan generated'),
            'plan': result.get('plan', []),
            'metadata': result.get('metadata', {})
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Study plan generation error: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'An error occurred: {str(e)}',
            'plan': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_description="Generates quick, actionable study tips for a specific topic.",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['topic'],
        properties={
            'topic': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='The topic to get study tips for',
                example='Calculus'
            ),
            'count': openapi.Schema(
                type=openapi.TYPE_INTEGER,
                description='Number of tips to generate (optional, default 5)',
                example=5
            ),
        },
        example={
            "topic": "Calculus",
            "count": 5
        }
    ),
    responses={
        200: openapi.Response(
            description="Successful study tips generation",
            examples={
                "application/json": {
                    "status": "success",
                    "topic": "Calculus",
                    "tips": [
                        "Start with understanding limits before derivatives",
                        "Practice solving problems daily",
                        "Visualize concepts with graphs",
                        "Review mistakes to learn from them",
                        "Use online resources for extra practice"
                    ]
                }
            }
        ),
        400: "Bad Request - Topic is required"
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([GenerativeAIThrottle])
def get_study_tips(request):
    """
    Quick Study Tips Endpoint
    
    🔓 PUBLIC ACCESS: No authentication required
    ⚠️ RATE LIMITED: 10 requests/day
    
    Generates quick, actionable study tips for a specific topic.
    
    Request Body (JSON):
    {
        "topic": "Calculus",
        "count": 5  // Optional: number of tips (default: 5)
    }
    
    Response:
    {
        "status": "success",
        "topic": "Calculus",
        "tips": [
            "Start with understanding limits before derivatives",
            ...
        ]
    }
    """
    try:
        data = request.data
        
        topic = data.get('topic', '').strip()
        if not topic:
            return Response({
                'status': 'error',
                'message': 'Topic is required.',
                'tips': []
            }, status=status.HTTP_400_BAD_REQUEST)
        
        count = data.get('count', 5)
        try:
            count = max(1, min(10, int(count)))
        except (ValueError, TypeError):
            count = 5
        
        # ── Response-level cache (30 min) keyed by topic+count ──
        topic_hash = hashlib.md5(topic.lower().encode()).hexdigest()[:12]
        cache_key = f"study_tips_{topic_hash}_{count}"
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(f"[StudyTips] Cache HIT for key={cache_key}")
            return Response(cached, status=status.HTTP_200_OK)
        
        from .study_planner import get_quick_tips
        
        result = get_quick_tips(topic=topic, count=count)
        
        cache.set(cache_key, result, timeout=1800)
        logger.info(f"[StudyTips] Cache SET for key={cache_key}")
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Study tips error: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e),
            'tips': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_description="Estimates how long it will take to learn a topic based on skill level and learning goal.",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['topic'],
        properties={
            'topic': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='The topic to learn'
            ),
            'skill_level': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Current skill level',
                enum=['beginner', 'intermediate', 'advanced'],
                default='beginner'
            ),
            'goal': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Learning goal',
                enum=['familiarity', 'proficiency', 'mastery'],
                default='proficiency'
            ),
        },
        example={
            "topic": "Python Programming",
            "skill_level": "beginner",
            "goal": "proficiency"
        }
    ),
    responses={
        200: openapi.Response(
            description="Successful time estimation",
            examples={
                "application/json": {
                    "status": "success",
                    "topic": "Python Programming",
                    "estimated_hours": 120,
                    "estimated_weeks": 8,
                    "hours_per_week": 15,
                    "breakdown": {
                        "theory": "30%",
                        "practice": "50%",
                        "projects": "20%"
                    }
                }
            }
        ),
        400: "Bad Request - Topic is required"
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def estimate_study_time_view(request):
    """
    Study Time Estimation Endpoint
    
    🔓 PUBLIC ACCESS: No authentication required
    
    Estimates how long it will take to learn a topic.
    """
    try:
        data = request.data
        
        topic = data.get('topic', '').strip()
        if not topic:
            return Response({
                'status': 'error',
                'message': 'Topic is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        skill_level = data.get('skill_level', 'beginner').lower()
        goal = data.get('goal', 'proficiency').lower()
        
        from .study_planner import estimate_study_time
        
        result = estimate_study_time(
            topic=topic,
            skill_level=skill_level,
            goal=goal
        )
        
        return Response({
            'status': 'success',
            **result
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Time estimation error: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


