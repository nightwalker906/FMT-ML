"""
Django models for the core app.
Maps to existing Supabase PostgreSQL tables.
"""
import uuid
from django.db import models


class Profile(models.Model):
    """
    User profile - represents a user in the system (student or tutor).
    Maps to the 'profiles' table in PostgreSQL.
    """
    USER_TYPE_CHOICES = [
        ('student', 'Student'),
        ('tutor', 'Tutor'),
    ]

    id = models.UUIDField(primary_key=True, editable=False)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=50)
    is_online = models.BooleanField(default=False)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = 'profiles'
        managed = False

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user_type})"


class Student(models.Model):
    """
    Student profile with learning preferences.
    Maps to the 'students' table in PostgreSQL.
    """
    profile = models.OneToOneField(
        Profile,
        on_delete=models.CASCADE,
        primary_key=True,
        to_field='id',
        db_column='profile_id'
    )
    grade_level = models.CharField(max_length=100)
    preferred_subjects = models.JSONField(default=list, blank=True)
    learning_goals = models.JSONField(default=list, blank=True)
    learning_style = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'students'
        managed = False

    def __str__(self):
        return f"Student: {self.profile.first_name} {self.profile.last_name}"


class Tutor(models.Model):
    """
    Tutor profile with qualifications and availability.
    Maps to the 'tutors' table in PostgreSQL.
    """
    profile = models.OneToOneField(
        Profile,
        on_delete=models.CASCADE,
        primary_key=True,
        to_field='id',
        db_column='profile_id'
    )
    experience_years = models.IntegerField()
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    qualifications = models.JSONField(default=list, blank=True)
    teaching_style = models.CharField(max_length=100, null=True, blank=True)
    bio_text = models.TextField(blank=True, null=True)
    availability = models.JSONField(default=dict, blank=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'tutors'
        managed = False

    def __str__(self):
        return f"Tutor: {self.profile.first_name} {self.profile.last_name} (${self.hourly_rate}/hr)"


class Subject(models.Model):
    """
    Subject that can be taught.
    Maps to the 'subjects' table in PostgreSQL.
    """
    id = models.UUIDField(primary_key=True, editable=False)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'subjects'
        managed = False

    def __str__(self):
        return f"{self.name} ({self.category})"


class Session(models.Model):
    """
    Tutoring session between a student and tutor.
    Maps to the 'sessions' table in PostgreSQL.
    """
    id = models.UUIDField(primary_key=True, editable=False)
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        to_field='profile_id',
        db_column='student_id'
    )
    tutor = models.ForeignKey(
        Tutor,
        on_delete=models.CASCADE,
        to_field='profile_id',
        db_column='tutor_id'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='subject_id'
    )
    scheduled_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=50)
    meeting_url = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        db_table = 'sessions'
        managed = False

    def __str__(self):
        return f"Session: {self.student.profile.first_name} with {self.tutor.profile.first_name} - {self.status}"


class Rating(models.Model):
    """
    Rating/review for a tutor from a student.
    Maps to the 'ratings' table in PostgreSQL.
    """
    id = models.UUIDField(primary_key=True, editable=False)
    session = models.ForeignKey(
        Session,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='session_id'
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        to_field='profile_id',
        db_column='student_id'
    )
    tutor = models.ForeignKey(
        Tutor,
        on_delete=models.CASCADE,
        to_field='profile_id',
        db_column='tutor_id'
    )
    knowledge_rating = models.IntegerField(null=True, blank=True)
    teaching_style_rating = models.IntegerField(null=True, blank=True)
    communication_rating = models.IntegerField(null=True, blank=True)
    overall_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    review_text = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        db_table = 'ratings'
        managed = False

    def __str__(self):
        return f"Rating: {self.overall_rating}/5 - {self.student.profile.first_name} -> {self.tutor.profile.first_name}"
