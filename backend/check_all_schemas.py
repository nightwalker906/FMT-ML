#!/usr/bin/env python
"""
Check all schemas and tables
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Get all schemas
    cursor.execute("""
        SELECT schema_name
        FROM information_schema.schemata
        ORDER BY schema_name;
    """)
    
    print("All schemas:")
    for row in cursor.fetchall():
        print(f"  - {row[0]}")
    
    # Check if users table exists
    print("\nLooking for 'users' table in all schemas:")
    cursor.execute("""
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_name = 'users'
        ORDER BY table_schema;
    """)
    
    rows = cursor.fetchall()
    if rows:
        for row in rows:
            print(f"  Found: {row[0]}.{row[1]}")
    else:
        print("  No 'users' table found")
    
    # Check the constraint details
    print("\nDetailed constraint on profiles table:")
    cursor.execute("""
        SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema,
            ccu.table_name,
            ccu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'profiles' AND tc.constraint_type = 'FOREIGN KEY';
    """)
    
    for row in cursor.fetchall():
        print(f"  {row[0]}: profiles.{row[1]} -> {row[2]}.{row[3]}.{row[4]}")
