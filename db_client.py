import psycopg2
from psycopg2.errors import IntegrityError
from psycopg2.extras import RealDictCursor
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

def calculate_score(tier, division):
    Tier_Map = {
        "UNRANKED": 0,
        "IRON": 0,
        "BRONZE": 400,
        "SILVER": 800,  
        "GOLD": 1200,
        "PLATINUM": 1600,
        "EMERALD": 2000,
        "DIAMOND": 2400,
        "MASTER": 2800,
        "GRANDMASTER": 3200,
        "CHALLENGER": 3600
    }
    Div_Map = {"IV": 0, "III": 100, "II": 200, "I": 300}
    return Tier_Map[tier] + Div_Map.get(division, 0)
def get_leaderboard():
    con = psycopg2.connect(
        host = "localhost",
        database = "unileague",
        user = "shaanbawa",
        port = "5432",
        password = "",
        cursor_factory=RealDictCursor
    )
    cur = con.cursor()
    query = "SELECT * FROM summoners"   
    cur.execute(query)
    summoners = cur.fetchall()
    for summoner in summoners:
        summoner['score'] = calculate_score(summoner['rank_tier'], summoner['rank_division'])
    sorted_list = sorted(summoners, key=lambda x: x['score'], reverse=True)
    return sorted_list

def get_user_by_email(email):
    con = psycopg2.connect(
        host = "localhost",
        database = "unileague",
        user = "shaanbawa",
        port = "5432",
        password = ""
    )
    cur = con.cursor()
    query = "SELECT user_id, password_hash FROM users WHERE user_email = %s"
    cur.execute(query, (email,))
    data = cur.fetchone()
    return data

def claim_summoner_(user_id, puuid):
    con = psycopg2.connect(
        host = "localhost",
        database = "unileague",
        user = "shaanbawa",
        port = "5432",
        password = ""
    )
    cur = con.cursor()
    query = '''
    UPDATE summoners
    SET user_id = %s
    WHERE puuid = %s
    '''
    cur.execute(query, (user_id, puuid))
    con.commit()
    return True
