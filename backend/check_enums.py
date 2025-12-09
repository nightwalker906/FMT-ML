#!/usr/bin/env python
"""
Check PostgreSQL enum values
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Get enum values
    cursor.execute("""
        SELECT enumlabel
        FROM pg_enum
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typname = 'subject_category_type'
        ORDER BY enumsortorder;
    """)
    
    print("Valid subject_category_type values:")
    for row in cursor.fetchall():
        print(f"  - {row[0]}")
