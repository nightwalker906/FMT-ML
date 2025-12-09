#!/usr/bin/env python
"""
Test database connection to Supabase PostgreSQL
"""
import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

# Test connection
from django.db import connection

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        print("✓ Database connection successful!")
        print(f"PostgreSQL version: {db_version[0]}")
        
        # List tables
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print(f"\nTables in database ({len(tables)} total):")
        for table in tables:
            print(f"  - {table[0]}")
            
except Exception as e:
    print(f"✗ Database connection failed!")
    print(f"Error: {e}")
    exit(1)
