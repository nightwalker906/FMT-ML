"""
DRF Serializers for the Find My Tutor API
"""
from rest_framework import serializers
from .models import Profile, Student, Tutor, Subject, Session, Rating


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['id', 'first_name', 'last_name', 'email', 'user_type', 'is_online', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudentSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    profile_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Student
        fields = ['profile', 'profile_id', 'grade_level', 'preferred_subjects', 'learning_goals', 'learning_style']
        read_only_fields = []


class TutorSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    profile_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Tutor
        fields = ['profile', 'profile_id', 'experience_years', 'hourly_rate', 'qualifications', 'teaching_style', 'bio_text', 'availability', 'average_rating']
        read_only_fields = ['average_rating']


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'category', 'description']
        read_only_fields = ['id']


class SessionSerializer(serializers.ModelSerializer):
    student_profile = serializers.SerializerMethodField()
    tutor_profile = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = Session
        fields = ['id', 'student', 'student_profile', 'tutor', 'tutor_profile', 'subject', 'subject_name', 'status', 'meeting_url', 'scheduled_time', 'duration_minutes', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_student_profile(self, obj):
        return {
            'id': obj.student.profile.id,
            'name': f"{obj.student.profile.first_name} {obj.student.profile.last_name}",
            'email': obj.student.profile.email,
        }

    def get_tutor_profile(self, obj):
        return {
            'id': obj.tutor.profile.id,
            'name': f"{obj.tutor.profile.first_name} {obj.tutor.profile.last_name}",
            'email': obj.tutor.profile.email,
            'hourly_rate': float(obj.tutor.hourly_rate),
        }


class RatingSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    tutor_name = serializers.SerializerMethodField()

    class Meta:
        model = Rating
        fields = ['id', 'student', 'student_name', 'tutor', 'tutor_name', 'session', 'knowledge_rating', 'teaching_style_rating', 'communication_rating', 'overall_rating', 'review_text', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_student_name(self, obj):
        return f"{obj.student.profile.first_name} {obj.student.profile.last_name}"

    def get_tutor_name(self, obj):
        return f"{obj.tutor.profile.first_name} {obj.tutor.profile.last_name}"
