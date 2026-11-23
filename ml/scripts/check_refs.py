import psycopg2

conn = psycopg2.connect('postgresql://unpanda_app:unpanda_secure_pass_2026@localhost:5432/fedsocial_db')
cur = conn.cursor()
cur.execute('SELECT "referenceUrls" FROM "Post" WHERE array_length("referenceUrls", 1) > 0 LIMIT 5')
rows = cur.fetchall()
print(f"Found {len(rows)} posts with referenceUrls:")
for r in rows:
    print(r)
conn.close()
