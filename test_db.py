import psycopg2
from psycopg2.errors import IntegrityError
#first connect to the database 
con = psycopg2.connect(
    host = "localhost",
    database = "unileague",
    user = "shaanbawa",
    port = "5432",
    password = ""
)


def save_summoner(data: dict):
    con = psycopg2.connect(
        host = "localhost",
        database = "unileague",
        user = "shaanbawa",
        port = "5432",
        password = ""
    )
    cur = con.cursor()
    query = ("""
        INSERT INTO summoners (puuid, game_name, tag, rank_tier, rank_division)
        VALUES (%s, %s, %s, %s, %s) 
        ON CONFLICT (puuid) 
        DO UPDATE SET
            game_name = EXCLUDED.game_name,
            tag = EXCLUDED.tag,
            rank_tier = EXCLUDED.rank_tier,
            rank_division = EXCLUDED.rank_division
        """)
    value = (data['puuid'], data['gameName'], data['tagLine'], data['rankTier'], data['rankDivision'])
    cur.execute(query, value)
    con.commit()
    
def get_university_id(domain):
    con = psycopg2.connect(
        host = "localhost",
        database = "unileague",
        user = "shaanbawa",
        port = "5432",
        password = ""
    )
    cur = con.cursor()
    query = "SELECT uni_id FROM universities WHERE uni_domain = %s"
    cur.execute(query, (domain,))
    result = cur.fetchone()
    con.close()
    if result:
        return result[0]
    else:
        return None

def create_user(email, password_hash, university_id):
    con = psycopg2.connect(
        host = "localhost",
        database = "unileague",
        user = "shaanbawa",
        port = "5432",
        password = ""
    )
    cur = con.cursor()
    try:
        query = "INSERT INTO users (user_email, password_hash, uni_id, is_verified) VALUES (%s, %s, %s, %s)"  
        cur.execute(query, (email, password_hash, university_id, False))  
        con.commit()
        return True
    except Exception as e:
        print(f'Error creating user: {e}')
        return False
# done with backend auth logic