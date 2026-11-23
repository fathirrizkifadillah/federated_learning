import psycopg2

conn = psycopg2.connect('postgresql://unpanda_app:unpanda_secure_pass_2026@localhost:5432/fedsocial_db')
cur = conn.cursor()
cur.execute('SELECT title, language, "categoryId", "publishedAt" FROM "Post" ORDER BY "publishedAt" DESC LIMIT 20')
for row in cur.fetchall():
    print(f"[{row[1]}] [{row[2]}] {row[0][:50]}... ({row[3]})")
conn.close()
