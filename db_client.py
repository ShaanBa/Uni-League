import psycopg2
import os
from psycopg2.errors import IntegrityError
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from contextlib import contextmanager

load_dotenv()

@contextmanager
def get_db_connection():
        con = psycopg2.connect(
            host = os.getenv("DB_HOST"),
            database = os.getenv("DB_NAME"),
            user = os.getenv("DB_USER"),
            port = os.getenv("DB_PORT"),
            password = os.getenv("DB_PASS")
        )
        try:
            yield con
        finally:
            con.commit()
            con.close()

def save_summoner(data: dict):
    with get_db_connection() as con:
        cur = con.cursor()
        query = ("""
            INSERT INTO summoners (puuid, game_name, tag, rank_tier, rank_division, lp)
            VALUES (%s, %s, %s, %s, %s, %s) 
            ON CONFLICT (puuid) 
            DO UPDATE SET
                game_name = EXCLUDED.game_name,
                tag = EXCLUDED.tag,
                rank_tier = EXCLUDED.rank_tier,
                rank_division = EXCLUDED.rank_division,
                lp = EXCLUDED.lp
            """)
        value = (data['puuid'], data['gameName'], data['tagLine'], data['rankTier'], data['rankDivision'], data['lp'])
        cur.execute(query, value)
    
def get_university_id(domain):
    with get_db_connection() as con:
        cur = con.cursor()
        query = "SELECT uni_id FROM universities WHERE uni_domain = %s"
        cur.execute(query, (domain,))
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            return None

def create_user(email, password_hash, university_id):
    with get_db_connection() as con:
        cur = con.cursor()
        try:
            query = "INSERT INTO users (user_email, password_hash, uni_id, is_verified) VALUES (%s, %s, %s, %s)"  
            cur.execute(query, (email, password_hash, university_id, False))  
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
def get_leaderboard(uni_id):
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        if uni_id == 'all':
            query = """SELECT universities.uni_name, puuid, game_name, rank_tier, rank_division, lp 
                    FROM summoners 
                    INNER JOIN users ON summoners.user_id = users.user_id 
                    JOIN universities ON users.uni_id = universities.uni_id"""
            cur.execute(query)        
        else:
            query = """SELECT universities.uni_name, puuid, game_name, rank_tier, rank_division, lp 
                    FROM summoners 
                    INNER JOIN users ON summoners.user_id = users.user_id 
                    JOIN universities ON users.uni_id = universities.uni_id 
                    WHERE users.uni_id = %s"""
            cur.execute(query, (uni_id,))
        
        summoners = cur.fetchall()
        for summoner in summoners:
            summoner['score'] = calculate_score(summoner['rank_tier'], summoner['rank_division'])
        sorted_list = sorted(summoners, key=lambda x: x['score'], reverse=True)
        return sorted_list

def get_user_by_email(email):
    with get_db_connection() as con:
        cur = con.cursor()
        query = "SELECT user_id, password_hash, uni_id FROM users WHERE user_email = %s"
        cur.execute(query, (email,))
        data = cur.fetchone()
        return data

def claim_summoner_(user_id, puuid):
    with get_db_connection() as con:
        cur = con.cursor()
        query = '''
        UPDATE summoners
        SET user_id = %s
        WHERE puuid = %s
        '''
        cur.execute(query, (user_id, puuid))
        return True