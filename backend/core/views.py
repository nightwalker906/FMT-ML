"""
API Views for Find My Tutor
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Q, Avg
from .models import Profile, Student, Tutor, Subject, Session, Rating
from .serializers import (
    ProfileSerializer, StudentSerializer, TutorSerializer,
    SubjectSerializer, SessionSerializer, RatingSerializer
)


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

