"""
URL configuration for fmt_project project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework import routers, permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# =============================================================================
# SWAGGER/OPENAPI DOCUMENTATION CONFIGURATION
# =============================================================================
# This creates an interactive API documentation interface at /swagger/
# Perfect for testing endpoints and generating screenshots for reports

schema_view = get_schema_view(
    openapi.Info(
        title="Find My Tutor API",
        default_version='v1',
        description="""
# 🎓 AI-Powered Tutoring Platform API

Welcome to the Find My Tutor (FMT) API documentation.

## Features

### 🤖 Machine Learning Endpoints
- **Tutor Recommendations** - TF-IDF + Cosine Similarity matching
- **Smart Pricing** - Linear Regression price prediction
- **Sentiment Analysis** - TextBlob NLP for review analysis

### 🧠 Generative AI Endpoints  
- **Study Planner** - Google Gemini powered study plans
- **Study Tips** - AI-generated learning advice

### 📊 CRUD Operations
- Profiles, Students, Tutors, Subjects, Sessions, Ratings

## Rate Limits
- Anonymous: 100 requests/day
- Authenticated: 1000 requests/day  
- AI Endpoints: 10 requests/day (to protect API quotas)

## Authentication
Use Token Authentication for protected endpoints.
        """,
        terms_of_service="https://www.findmytutor.com/terms/",
        contact=openapi.Contact(email="support@findmytutor.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    # API Endpoints
    path('api/', include('core.urls')),
    
    # ===========================================
    # API Documentation (Swagger UI & ReDoc)
    # ===========================================
    # Swagger UI - Interactive documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    # ReDoc - Alternative documentation style
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    # Raw OpenAPI schema (JSON/YAML)
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
]
