# Find My Tutor - Django Backend

A Django REST Framework backend for the Find My Tutor platform, connecting to PostgreSQL (Supabase) with pre-existing database tables.

## Tech Stack

- **Framework**: Django 4.2.8 + Django REST Framework 3.14.0
- **Database**: PostgreSQL (Supabase)
- **Server**: Gunicorn (production)
- **Authentication**: Token-based (DRF)

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

**Key packages:**
- `Django==4.2.8` - Web framework
- `djangorestframework==3.14.0` - REST API toolkit
- `psycopg2-binary==2.9.9` - PostgreSQL adapter
- `dj-database-url==2.1.0` - Database URL parsing
- `python-dotenv==1.0.0` - Environment variable management
- `django-cors-headers==4.3.1` - CORS support
- `gunicorn==21.2.0` - Production server

### 2. Configure Environment Variables

Create a `.env` file in the backend directory (copy from `.env.example`):

```bash
cp .env.example .env
```

**Required variables:**
```
DATABASE_URL=postgresql://user:password@db.xxxxx.supabase.co:5432/postgres
SECRET_KEY=your-secret-key-here
DEBUG=False  # Set to False in production
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

**Get your Supabase DATABASE_URL:**
1. Go to Supabase Dashboard → Your Project → Settings → Database
2. Copy the full connection string from "Connection string" (PostgreSQL)
3. It looks like: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`

### 3. Database Models

The models are configured to work with your existing Supabase tables:

- **Profile** - User account (student or tutor)
- **Student** - Student-specific data
- **Tutor** - Tutor-specific data
- **Subject** - Available subjects
- **Session** - Tutoring sessions

All models have `managed = False` to prevent Django migrations from altering your existing tables.

### 4. Run the Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## Project Structure

```
backend/
├── manage.py                # Django management script
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variable template
├── fmt_project/            # Main Django project
│   ├── __init__.py
│   ├── settings.py         # Django configuration
│   ├── urls.py             # Main URL routing
│   └── wsgi.py             # WSGI application
└── core/                   # Core app with models and APIs
    ├── models.py           # Django ORM models
    ├── views.py            # API views
    ├── urls.py             # Core app URL routing
    └── apps.py             # App configuration
```

## Database Schema

### profiles
- `id` (UUID, PK)
- `first_name`, `last_name`, `email`
- `user_type` ('student' or 'tutor')
- `is_online` (Boolean)

### students
- `profile_id` (FK to profiles, PK)
- `grade_level`
- `preferred_subjects` (JSONB)
- `learning_goals` (JSONB)
- `learning_style`

### tutors
- `profile_id` (FK to profiles, PK)
- `hourly_rate`, `experience_years`
- `qualifications` (JSONB)
- `teaching_style`, `bio_text`
- `availability` (JSONB)

### subjects
- `id` (PK)
- `name`, `category`

### sessions
- `id` (PK)
- `student_id` (FK to students)
- `tutor_id` (FK to tutors)
- `subject_id` (FK to subjects)
- `status` (scheduled, in_progress, completed, cancelled)
- `meeting_url`

## Important Notes

⚠️ **DO NOT RUN MIGRATIONS** - Your database tables already exist in Supabase. Django migrations are disabled for all models.

All models use:
```python
class Meta:
    db_table = 'table_name'  # Maps to existing table
    managed = False          # Prevents Django from managing the table
```

## Troubleshooting

### Connection Error to Supabase
- Verify `DATABASE_URL` is correct in `.env`
- Check if Supabase database is running
- Ensure psycopg2 is installed: `pip install psycopg2-binary`

### Import Errors
- Run: `pip install -r requirements.txt`
- Verify virtual environment is activated

### Port Already in Use
```bash
python manage.py runserver 8001  # Use different port
```

## Next Steps

1. Create serializers in `core/serializers.py` for API responses
2. Create viewsets in `core/views.py` for CRUD operations
3. Register viewsets in `core/urls.py`
4. Add authentication views (login, signup)
5. Set up API documentation (Swagger/DRF Browsable API)

## Production Deployment

```bash
# Collect static files
python manage.py collectstatic --noinput

# Run with Gunicorn
gunicorn fmt_project.wsgi:application --bind 0.0.0.0:8000
```

Ensure environment variables are set in your hosting platform (e.g., Railway, Render, Heroku).
