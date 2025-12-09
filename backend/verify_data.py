#!/usr/bin/env python
"""
Verify seeded data in database
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

from core.models import Profile, Student, Tutor, Subject, Session, Rating

print(f"Subjects: {Subject.objects.count()}")
for s in Subject.objects.all():
    print(f"  - {s.name} ({s.category})")

print(f"\nProfiles: {Profile.objects.count()}")
for p in Profile.objects.all()[:5]:
    print(f"  - {p.first_name} {p.last_name} ({p.user_type})")

print(f"\nTutors: {Tutor.objects.count()}")
for t in Tutor.objects.all():
    print(f"  - {t.profile.first_name} {t.profile.last_name} (${t.hourly_rate}/hr)")

print(f"\nStudents: {Student.objects.count()}")
for s in Student.objects.all():
    print(f"  - {s.profile.first_name} {s.profile.last_name} (Grade {s.grade_level})")

print(f"\nSessions: {Session.objects.count()}")
for sess in Session.objects.all():
    print(f"  - {sess.student.profile.first_name} with {sess.tutor.profile.first_name} ({sess.status})")

print(f"\nRatings: {Rating.objects.count()}")
for r in Rating.objects.all():
    print(f"  - {r.overall_rating} stars from {r.student.profile.first_name} to {r.tutor.profile.first_name}")
