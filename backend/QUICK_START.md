# Find My Tutor Backend - Quick Reference

## Installation & Setup (5 minutes)

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Configure Database
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase DATABASE_URL:
```
DATABASE_URL=postgresql://postgres:YourPassword@db.xxxxx.supabase.co:5432/postgres
SECRET_KEY=your-secret-key-here
```

### Step 3: Test Connection
```bash
python manage.py dbshell
```
If you see `postgres=#` prompt, your connection works!

### Step 4: Run Server
```bash
python manage.py runserver
```

Visit: `http://localhost:8000/api/`

---

## Key Commands

```bash
# Check database connection
python manage.py dbshell

# View all database tables (in dbshell)
\dt

# Create superuser (optional, for Django admin)
python manage.py createsuperuser

# See all models
python manage.py inspectdb

# Run in production mode
python manage.py runserver 0.0.0.0:8000
```

---

## API Endpoints (to be implemented)

```
GET    /api/students/        - List all students
GET    /api/students/<id>/   - Get student details
POST   /api/students/        - Create student

GET    /api/tutors/          - List all tutors
GET    /api/tutors/<id>/     - Get tutor details
POST   /api/tutors/          - Create tutor

GET    /api/sessions/        - List sessions
POST   /api/sessions/        - Book a session
```

---

## Important: Models Are Read-Only

Your database tables were created in Supabase. The Django models **cannot** modify them:

```python
class Meta:
    managed = False  # ← This prevents Django from changing the DB
```

✅ Safe operations: Read, Insert, Update, Delete data
❌ Unsafe operations: Change table structure (will error)

---

## Environment Variables Checklist

- [ ] `DATABASE_URL` - Supabase connection string
- [ ] `SECRET_KEY` - Generated Django secret
- [ ] `DEBUG` - Set to `False` in production
- [ ] `ALLOWED_HOSTS` - Your domain(s)
- [ ] `CORS_ALLOWED_ORIGINS` - Frontend URL(s)

---

## Next: Create API Serializers & Views

Create `core/serializers.py`:
```python
from rest_framework import serializers
from .models import Profile, Student, Tutor

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'

class StudentSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer()
    class Meta:
        model = Student
        fields = '__all__'
```

Then add viewsets in `core/views.py` and register them in `core/urls.py`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `connection refused` | Check DATABASE_URL in .env |
| `psycopg2 not found` | Run `pip install psycopg2-binary` |
| `port 8000 in use` | Use `python manage.py runserver 8001` |
| `module not found` | Activate venv: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows) |

---

## Project Structure
```
backend/
├── manage.py
├── requirements.txt
├── .env.example (copy to .env)
├── fmt_project/ (Django project)
│   ├── settings.py (edit for new apps)
│   ├── urls.py (add API routes)
│   └── wsgi.py
└── core/ (main app with models)
    ├── models.py (Profile, Student, Tutor, etc.)
    ├── views.py (add viewsets here)
    ├── urls.py (register viewsets here)
    └── serializers.py (create this next)
```

---

Good luck! 🚀
