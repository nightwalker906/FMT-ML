"""
=============================================================================
Virtual Classrooms / Group Courses — API Views
=============================================================================

Endpoints:
  GET    /api/courses/                 List active courses (catalogue)
  GET    /api/courses/<course_id>/     Course detail + sessions + resources
  POST   /api/courses/enroll/          Enroll a student in a course

Author: FMT Development Team
=============================================================================
"""
import logging
import secrets

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Q, Prefetch

from .models import Course, Enrollment, CourseSession, CourseResource, Profile
from .course_serializers import (
    CourseListSerializer,
    CourseDetailSerializer,
    EnrollmentCreateSerializer,
    EnrollmentReadSerializer,
)

logger = logging.getLogger(__name__)


def _generate_room_name(session_id):
    """Build a short, human-readable room name for Jitsi."""
    random_suffix = secrets.token_urlsafe(8).replace('-', '').replace('_', '')[:10]
    return f"fmt-{str(session_id)[:8]}-{random_suffix}"


# ─── List Active Courses ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def list_courses(request):
    """
    List Active Courses (Student Catalogue)

    Public access — no authentication required.

    Returns all active courses with tutor info, enrollment counts,
    and the next upcoming session.

    Query Parameters:
      - subject_id: Filter by subject UUID
      - tutor_id:   Filter by tutor UUID
      - max_price:  Maximum course price
      - search:     Search in title and description
    """
    queryset = Course.objects.filter(is_active=True).select_related(
        'tutor', 'subject',
    ).prefetch_related(
        Prefetch(
            'enrollments',
            queryset=Enrollment.objects.filter(status='enrolled'),
        ),
        Prefetch(
            'sessions',
            queryset=CourseSession.objects.filter(
                status__in=['scheduled', 'live'],
            ).order_by('scheduled_start'),
        ),
    )

    # ── Filters ──
    subject_id = request.query_params.get('subject_id')
    if subject_id:
        queryset = queryset.filter(subject_id=subject_id)

    tutor_id = request.query_params.get('tutor_id')
    if tutor_id:
        queryset = queryset.filter(tutor_id=tutor_id)

    max_price = request.query_params.get('max_price')
    if max_price:
        try:
            queryset = queryset.filter(price__lte=float(max_price))
        except (ValueError, TypeError):
            pass

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    # Filter by class code (exact match, case-insensitive)
    class_code = request.query_params.get('class_code', '').strip().upper()
    if class_code:
        queryset = queryset.filter(class_code=class_code)

    # ── Order by newest first ──
    queryset = queryset.order_by('-created_at')

    serializer = CourseListSerializer(queryset, many=True, context={'request': request})

    return Response({
        'status': 'success',
        'count': queryset.count(),
        'courses': serializer.data,
    })


# ─── Course Detail ────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def course_detail(request, course_id):
    """
    Course Detail Endpoint

    Public access — no authentication required.

    Returns full course information with:
    - All scheduled sessions (with meeting URLs)
    - Uploaded resources (files, links)
    - Enrollment count and remaining spots
    - Whether a specific student is enrolled (via ?student_id=)
    - Enrolled students list (only if ?tutor_id= matches course tutor)
    """
    try:
        course = Course.objects.select_related(
            'tutor', 'subject',
        ).prefetch_related(
            Prefetch(
                'sessions',
                queryset=CourseSession.objects.order_by('scheduled_start'),
            ),
            Prefetch(
                'resources',
                queryset=CourseResource.objects.order_by('-uploaded_at'),
            ),
            Prefetch(
                'enrollments',
                queryset=Enrollment.objects.filter(status='enrolled').select_related('student'),
            ),
        ).get(id=course_id)
    except Course.DoesNotExist:
        return Response(
            {'status': 'error', 'error': 'Course not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = CourseDetailSerializer(course, context={'request': request})

    return Response({
        'status': 'success',
        'course': serializer.data,
    })


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
@throttle_classes([])
def join_live_session(request, session_id):
    """
    Join a live course session.

    Behavior:
    - Fetches the course_session by ID.
    - If room_name is null, creates a unique random room name and saves it.
    - Returns the room_name to the frontend for JitsiMeeting.
    """
    try:
        with transaction.atomic():
            course_session = CourseSession.objects.select_for_update().get(id=session_id)

            if not course_session.room_name:
                generated = None
                for _ in range(10):
                    candidate = _generate_room_name(course_session.id)
                    if not CourseSession.objects.filter(room_name=candidate).exists():
                        generated = candidate
                        break

                if not generated:
                    return Response(
                        {'status': 'error', 'error': 'Could not generate a unique room name.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                course_session.room_name = generated
                course_session.save(update_fields=['room_name'])

            room_name = course_session.room_name

        return Response(
            {
                'status': 'success',
                'session_id': str(course_session.id),
                'course_id': str(course_session.course_id),
                'room_name': room_name,
                'meeting_url': course_session.meeting_url,
                'session_status': course_session.status,
            },
            status=status.HTTP_200_OK,
        )

    except CourseSession.DoesNotExist:
        return Response(
            {'status': 'error', 'error': 'Course session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )


# ─── Enroll in a Course ───────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def enroll_in_course(request):
    """
    Course Enrollment Endpoint

    Enrolls a student in a course after validating:
    1. Course exists and is active.
    2. Student profile exists.
    3. Student is not already enrolled.
    4. Course has not reached max_students capacity.
    5. Tutor cannot enroll in their own course.

    Request Body:
      - student_id: UUID of the student profile
      - course_id:  UUID of the course to enroll in
    """
    serializer = EnrollmentCreateSerializer(data=request.data)

    if not serializer.is_valid():
        # Flatten errors for cleaner frontend handling
        errors = serializer.errors
        first_error = None
        for field, messages in errors.items():
            if isinstance(messages, list):
                first_error = messages[0] if messages else str(messages)
            elif isinstance(messages, dict):
                first_error = str(messages.get('detail', messages))
            else:
                first_error = str(messages)
            break

        return Response(
            {
                'status': 'error',
                'error': first_error or 'Invalid enrollment data.',
                'details': errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    enrollment = serializer.save()

    # Fetch course title for the success message
    course = Course.objects.get(id=enrollment.course_id)
    enrolled_count = course.enrollments.filter(status='enrolled').count()

    logger.info(
        "Student %s enrolled in course %s (%d/%d)",
        enrollment.student_id,
        course.title,
        enrolled_count,
        course.max_students,
    )

    return Response(
        {
            'status': 'success',
            'message': f"Successfully enrolled in {course.title}!",
            'enrollment': EnrollmentReadSerializer(enrollment).data,
            'course_stats': {
                'enrolled_count': enrolled_count,
                'spots_remaining': max(0, course.max_students - enrolled_count),
                'max_students': course.max_students,
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ─── Join Course by Class Code ────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def join_by_code(request):
    """
    Join a Course by Class Code

    Allows a student to look up and enroll in a course using a short class code
    (e.g. "A3F9K2") instead of searching by name.

    Request Body:
      - student_id: UUID of the student profile
      - class_code: 6-character class code (case-insensitive)
    """
    student_id = request.data.get('student_id')
    class_code = request.data.get('class_code', '').strip().upper()

    if not student_id:
        return Response(
            {'status': 'error', 'error': 'student_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not class_code:
        return Response(
            {'status': 'error', 'error': 'class_code is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate student
    if not Profile.objects.filter(id=student_id, user_type='student').exists():
        return Response(
            {'status': 'error', 'error': 'Student profile not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Look up course by code
    try:
        course = Course.objects.select_related('tutor', 'subject').get(class_code=class_code)
    except Course.DoesNotExist:
        return Response(
            {'status': 'error', 'error': f'No course found with code "{class_code}". Please check and try again.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not course.is_active:
        return Response(
            {'status': 'error', 'error': 'This course is no longer accepting new students.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if already enrolled
    if Enrollment.objects.filter(student_id=student_id, course_id=course.id, status='enrolled').exists():
        return Response(
            {'status': 'error', 'error': 'You are already enrolled in this course.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check capacity
    enrolled_count = course.enrollments.filter(status='enrolled').count()
    if enrolled_count >= course.max_students:
        return Response(
            {'status': 'error', 'error': f'This course is full ({course.max_students}/{course.max_students} students).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Prevent tutor from enrolling in own course
    if str(student_id) == str(course.tutor_id):
        return Response(
            {'status': 'error', 'error': 'Tutors cannot enroll in their own courses.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create enrollment
    import uuid as _uuid
    enrollment = Enrollment.objects.create(
        id=_uuid.uuid4(),
        student_id=student_id,
        course_id=course.id,
        status='enrolled',
    )

    enrolled_count = course.enrollments.filter(status='enrolled').count()

    logger.info(
        "Student %s joined course %s via code %s (%d/%d)",
        student_id, course.title, class_code,
        enrolled_count, course.max_students,
    )

    serializer = CourseDetailSerializer(course, context={'request': request})

    return Response(
        {
            'status': 'success',
            'message': f'Successfully joined "{course.title}"!',
            'course': serializer.data,
            'course_stats': {
                'enrolled_count': enrolled_count,
                'spots_remaining': max(0, course.max_students - enrolled_count),
                'max_students': course.max_students,
            },
        },
        status=status.HTTP_201_CREATED,
    )
