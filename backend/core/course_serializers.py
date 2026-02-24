"""
DRF Serializers for the Virtual Classrooms / Group Courses feature.

Separated from core serializers to keep the codebase modular.
"""
import uuid
from rest_framework import serializers
from django.db.models import Count, Q
from .models import Course, Enrollment, CourseSession, CourseResource, Profile, Subject


# ─── Nested Read Serializers ──────────────────────────────────────────────────

class CourseTutorSerializer(serializers.ModelSerializer):
    """Lightweight tutor info embedded in course responses."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['id', 'first_name', 'last_name', 'full_name', 'email', 'avatar', 'is_online']
        read_only_fields = fields

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class CourseSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'category']
        read_only_fields = fields


class CourseSessionSerializer(serializers.ModelSerializer):
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = CourseSession
        fields = [
            'id', 'title', 'scheduled_start', 'scheduled_end',
            'meeting_url', 'status', 'duration_minutes', 'created_at',
        ]
        read_only_fields = fields

    def get_duration_minutes(self, obj):
        if obj.scheduled_start and obj.scheduled_end:
            delta = obj.scheduled_end - obj.scheduled_start
            return int(delta.total_seconds() / 60)
        return None


class CourseResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseResource
        fields = ['id', 'title', 'file_url', 'uploaded_at']
        read_only_fields = fields


class EnrollmentStudentSerializer(serializers.ModelSerializer):
    """Student info shown inside enrollment records (tutor's view)."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['id', 'first_name', 'last_name', 'full_name', 'avatar']
        read_only_fields = fields

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


# ─── Core Serializers ────────────────────────────────────────────────────────

class CourseListSerializer(serializers.ModelSerializer):
    """
    Used for GET /api/courses/ — the public course catalogue.
    Includes tutor info, subject, and enrollment stats.
    """
    tutor = CourseTutorSerializer(read_only=True)
    subject = CourseSubjectSerializer(read_only=True)
    enrolled_count = serializers.SerializerMethodField()
    spots_remaining = serializers.SerializerMethodField()
    next_session = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'class_code', 'price', 'max_students',
            'is_active', 'created_at',
            'tutor', 'subject',
            'enrolled_count', 'spots_remaining', 'next_session',
        ]
        read_only_fields = fields

    def get_enrolled_count(self, obj):
        return obj.enrollments.filter(status='enrolled').count()

    def get_spots_remaining(self, obj):
        enrolled = obj.enrollments.filter(status='enrolled').count()
        return max(0, obj.max_students - enrolled)

    def get_next_session(self, obj):
        from django.utils import timezone
        upcoming = obj.sessions.filter(
            scheduled_start__gte=timezone.now(),
            status__in=['scheduled', 'live'],
        ).first()
        if upcoming:
            return CourseSessionSerializer(upcoming).data
        return None


class CourseDetailSerializer(serializers.ModelSerializer):
    """
    Used for GET /api/courses/<id>/ — full course detail page.
    Includes sessions, resources, enrolled students list.
    """
    tutor = CourseTutorSerializer(read_only=True)
    subject = CourseSubjectSerializer(read_only=True)
    sessions = CourseSessionSerializer(many=True, read_only=True)
    resources = CourseResourceSerializer(many=True, read_only=True)
    enrolled_count = serializers.SerializerMethodField()
    spots_remaining = serializers.SerializerMethodField()
    enrolled_students = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'class_code', 'price', 'max_students',
            'is_active', 'created_at',
            'tutor', 'subject',
            'sessions', 'resources',
            'enrolled_count', 'spots_remaining',
            'enrolled_students', 'is_enrolled',
        ]
        read_only_fields = fields

    def get_enrolled_count(self, obj):
        return obj.enrollments.filter(status='enrolled').count()

    def get_spots_remaining(self, obj):
        enrolled = obj.enrollments.filter(status='enrolled').count()
        return max(0, obj.max_students - enrolled)

    def get_enrolled_students(self, obj):
        """Only visible to the course tutor."""
        request = self.context.get('request')
        if request and str(request.query_params.get('tutor_id', '')) == str(obj.tutor_id):
            students = Profile.objects.filter(
                enrollments__course=obj,
                enrollments__status='enrolled',
            )
            return EnrollmentStudentSerializer(students, many=True).data
        return []

    def get_is_enrolled(self, obj):
        """Check if the requesting student is enrolled."""
        request = self.context.get('request')
        student_id = request.query_params.get('student_id') if request else None
        if student_id:
            return obj.enrollments.filter(
                student_id=student_id,
                status='enrolled',
            ).exists()
        return False


class EnrollmentCreateSerializer(serializers.Serializer):
    """
    Used for POST /api/courses/enroll/ — enroll a student in a course.
    Validates capacity, duplicate enrollment, and course status.
    """
    student_id = serializers.UUIDField()
    course_id = serializers.UUIDField()

    def validate_course_id(self, value):
        try:
            course = Course.objects.get(id=value)
        except Course.DoesNotExist:
            raise serializers.ValidationError("Course not found.")
        if not course.is_active:
            raise serializers.ValidationError("This course is no longer accepting enrollments.")
        return value

    def validate_student_id(self, value):
        if not Profile.objects.filter(id=value, user_type='student').exists():
            raise serializers.ValidationError("Student profile not found.")
        return value

    def validate(self, attrs):
        course = Course.objects.get(id=attrs['course_id'])
        student_id = attrs['student_id']

        # Check duplicate
        if Enrollment.objects.filter(
            student_id=student_id,
            course_id=course.id,
            status='enrolled',
        ).exists():
            raise serializers.ValidationError(
                {"detail": "You are already enrolled in this course."}
            )

        # Check capacity
        enrolled_count = course.enrollments.filter(status='enrolled').count()
        if enrolled_count >= course.max_students:
            raise serializers.ValidationError(
                {"detail": f"This course is full ({course.max_students}/{course.max_students} students)."}
            )

        # Check tutor enrolling in own course
        if str(student_id) == str(course.tutor_id):
            raise serializers.ValidationError(
                {"detail": "Tutors cannot enroll in their own courses."}
            )

        return attrs

    def create(self, validated_data):
        enrollment = Enrollment.objects.create(
            id=uuid.uuid4(),
            student_id=validated_data['student_id'],
            course_id=validated_data['course_id'],
            status='enrolled',
        )
        return enrollment


class EnrollmentReadSerializer(serializers.ModelSerializer):
    """Enrollment record with nested student and course info."""
    student = EnrollmentStudentSerializer(read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course', 'course_title', 'status', 'enrolled_at']
        read_only_fields = fields
