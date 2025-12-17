import psycopg2

#first connect to the database 
con = psycopg2.connect(
    host = "localhost",
    database = "unileague",
    user = "shaanbawa",
    port = "5432",
    password = ""
)

cur = con.cursor()

cur.execute("SELECT * FROM universities")

rows = cur.fetchall()

for r in rows:
    print(f"id {r[0]}, whatev {r[1]}")
    
cur.close()
con.close()