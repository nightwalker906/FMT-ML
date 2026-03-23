"""
Django models for the core app.
Maps to existing Supabase PostgreSQL tables.
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


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
    user_type = models.CharField(max_length=50, choices=USER_TYPE_CHOICES)
    is_online = models.BooleanField(default=False)
    avatar = models.TextField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
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
    experience_years = models.IntegerField(validators=[MinValueValidator(0)])
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    qualifications = models.JSONField(default=list, blank=True)
    teaching_style = models.CharField(max_length=100, null=True, blank=True)
    bio_text = models.TextField(blank=True, null=True)
    availability = models.JSONField(default=dict, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
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
    knowledge_rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    teaching_style_rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    communication_rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    overall_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(5)])
    review_text = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        db_table = 'ratings'
        managed = False

    def __str__(self):
        return f"Rating: {self.overall_rating}/5 - {self.student.profile.first_name} -> {self.tutor.profile.first_name}"


# ─── Virtual Classrooms / Group Courses ──────────────────────────────────────

class Course(models.Model):
    """
    Virtual classroom / group course created by a tutor.
    Maps to the 'courses' table in PostgreSQL.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tutor = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        db_column='tutor_id',
        related_name='courses_teaching',
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='subject_id',
        related_name='courses',
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    class_code = models.CharField(max_length=8, unique=True, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    max_students = models.IntegerField(default=30, validators=[MinValueValidator(1)])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'courses'
        managed = False
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} (by {self.tutor.first_name} {self.tutor.last_name})"


class Enrollment(models.Model):
    """
    Student enrollment in a course.
    Maps to the 'enrollments' table in PostgreSQL.
    """
    STATUS_CHOICES = [
        ('enrolled', 'Enrolled'),
        ('dropped', 'Dropped'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        db_column='student_id',
        related_name='enrollments',
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        db_column='course_id',
        related_name='enrollments',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enrolled')
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'enrollments'
        managed = False
        unique_together = [('student', 'course')]

    def __str__(self):
        return f"{self.student.first_name} → {self.course.title} ({self.status})"


class CourseSession(models.Model):
    """
    A scheduled live session within a course (Zoom-style meeting slot).
    Maps to the 'course_sessions' table in PostgreSQL.
    """
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('live', 'Live'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        db_column='course_id',
        related_name='sessions',
    )
    title = models.CharField(max_length=255)
    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()
    meeting_url = models.TextField(blank=True, null=True)
    room_name = models.TextField(unique=True, blank=True, null=True)
    transcript = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'course_sessions'
        managed = False
        ordering = ['scheduled_start']

    def __str__(self):
        return f"{self.title} ({self.scheduled_start:%Y-%m-%d %H:%M})"


class CourseResource(models.Model):
    """
    Uploaded resource / material for a course (PDFs, slides, links).
    Maps to the 'course_resources' table in PostgreSQL.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        db_column='course_id',
        related_name='resources',
    )
    title = models.CharField(max_length=255)
    file_url = models.TextField()
    resource_type = models.CharField(max_length=50, default='material')
    due_date = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'course_resources'
        managed = False
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.title} ({self.course.title})"


class Quiz(models.Model):
    """
    AI-generated quiz linked to a course session.
    Maps to the 'quizzes' table in PostgreSQL.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course_session = models.ForeignKey(
        CourseSession,
        on_delete=models.CASCADE,
        db_column='course_session_id',
        related_name='quizzes',
    )
    title = models.CharField(max_length=255)
    is_published = models.BooleanField(default=False)
    resource = models.ForeignKey(
        CourseResource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='resource_id',
        related_name='quiz',
    )

    class Meta:
        db_table = 'quizzes'
        managed = False

    def __str__(self):
        return f"Quiz: {self.title} ({self.course_session_id})"


class QuizQuestion(models.Model):
    """
    Question belonging to a quiz.
    Maps to the 'quiz_questions' table in PostgreSQL.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        db_column='quiz_id',
        related_name='questions',
    )
    question_text = models.TextField()
    options = models.JSONField()
    correct_index = models.IntegerField()
    explanation = models.TextField()

    class Meta:
        db_table = 'quiz_questions'
        managed = False

    def __str__(self):
        return f"QuizQuestion: {self.question_text[:40]}"
