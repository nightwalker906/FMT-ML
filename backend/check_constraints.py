#!/usr/bin/env python
"""
Check all database tables and constraints
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Get all tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    
    print("All tables in database:")
    for row in cursor.fetchall():
        print(f"  - {row[0]}")
    
    print("\n" + "="*50)
    print("All foreign key constraints:")
    cursor.execute("""
        SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name;
    """)
    
    rows = cursor.fetchall()
    if rows:
        for row in rows:
            print(f"  {row[0]}.{row[1]} -> {row[2]}.{row[3]}")
    else:
        print("  No foreign key constraints found")

