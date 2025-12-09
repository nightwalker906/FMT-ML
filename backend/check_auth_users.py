#!/usr/bin/env python
"""
Check auth.users table
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Get auth.users columns
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'users'
        ORDER BY ordinal_position;
    """)
    
    print("auth.users table structure:")
    for row in cursor.fetchall():
        print(f"  - {row[0]} ({row[1]})")
    
    # Get count of users
    cursor.execute("SELECT COUNT(*) FROM auth.users;")
    count = cursor.fetchone()[0]
    print(f"\nTotal users in auth.users: {count}")
    
    if count > 0:
        print("\nFirst few users:")
        cursor.execute("""
            SELECT id, email FROM auth.users LIMIT 5;
        """)
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]}")
