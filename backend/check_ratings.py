#!/usr/bin/env python
import psycopg2
from urllib.parse import urlparse
import os

url = os.getenv('DATABASE_URL')
parsed = urlparse(url)

conn = psycopg2.connect(
    host=parsed.hostname,
    port=parsed.port,
    database=parsed.path[1:],
    user=parsed.username,
    password=parsed.password
)

cursor = conn.cursor()
cursor.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'ratings' and table_schema = 'public'
    ORDER BY ordinal_position;
""")

print('Ratings table columns:')
for row in cursor.fetchall():
    print(f"  - {row[0]:30} ({row[1]:30}) nullable={row[2]}")

conn.close()
