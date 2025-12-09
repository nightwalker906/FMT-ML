#!/usr/bin/env python
"""
Check database schema
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fmt_project.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Get all tables and their columns
    cursor.execute("""
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
    """)
    
    current_table = None
    for row in cursor.fetchall():
        table_name, column_name, data_type = row
        if table_name != current_table:
            print(f"\n{table_name}:")
            current_table = table_name
        print(f"  - {column_name} ({data_type})")
