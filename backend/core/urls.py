"""
API URLs for the core app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .ai.quick_tutor import quick_tutor_chat
from .ai.tutor_assistant import tutor_command_chat
from .course_views import (
    list_courses,
    course_detail,
    enroll_in_course,
    join_by_code,
    join_live_session,
)

router = DefaultRouter()
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'students', views.StudentViewSet, basename='student')
router.register(r'tutors', views.TutorViewSet, basename='tutor')
router.register(r'subjects', views.SubjectViewSet, basename='subject')
router.register(r'sessions', views.SessionViewSet, basename='session')
router.register(r'ratings', views.RatingViewSet, basename='rating')

urlpatterns = [
    path('', include(router.urls)),
    
    # ML-Powered Recommendation Endpoints
    path('recommendations/', views.get_smart_recommendations, name='smart-recommendations'),
    path('recommend/', views.recommend_tutors, name='recommend-tutors'),
    path('recommend/health/', views.recommendation_health, name='recommend-health'),
    
    # Sentiment Analysis Endpoints
    path('analyze-review/', views.analyze_review, name='analyze-review'),
    path('analyze-reviews/batch/', views.analyze_reviews_batch, name='analyze-reviews-batch'),
    path('tutor/<str:tutor_id>/sentiment/', views.analyze_tutor_sentiment, name='tutor-sentiment'),
    
    # Smart Pricing Endpoints (Predictive Analytics - Linear Regression)
    path('predict-price/', views.predict_price, name='predict-price'),
    path('market-analysis/', views.market_analysis, name='market-analysis'),
    path('debug/db-check/', views.debug_db_check, name='debug-db-check'),
    
    # AI Study Planner Endpoints (Generative AI - Free Services: Ollama/Hugging Face)
    path('generate-plan/', views.generate_plan, name='generate-plan'),
    path('study-tips/', views.get_study_tips, name='study-tips'),
    path('estimate-time/', views.estimate_study_time_view, name='estimate-time'),
    
    # Quick Tutor AI (Gemini + Serper)
    path('ai/quick-tutor/', quick_tutor_chat, name='quick-tutor-chat'),
    
    # Tutor AI Command Center (Spotlight Search)
    path('ai/tutor-command/', tutor_command_chat, name='tutor-command-chat'),
    
    # Virtual Classrooms / Group Courses
    path('courses/', list_courses, name='course-list'),
    path('courses/enroll/', enroll_in_course, name='course-enroll'),
    path('courses/join-by-code/', join_by_code, name='course-join-by-code'),
    path('courses/sessions/<uuid:session_id>/join/', join_live_session, name='course-session-join'),
    path('courses/<uuid:course_id>/', course_detail, name='course-detail'),
]
