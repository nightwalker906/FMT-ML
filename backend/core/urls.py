"""
API URLs for the core app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'students', views.StudentViewSet, basename='student')
router.register(r'tutors', views.TutorViewSet, basename='tutor')
router.register(r'subjects', views.SubjectViewSet, basename='subject')
router.register(r'sessions', views.SessionViewSet, basename='session')
router.register(r'ratings', views.RatingViewSet, basename='rating')

urlpatterns = [
    path('', include(router.urls)),
]
