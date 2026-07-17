import psycopg2
import os
from psycopg2.errors import IntegrityError
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from contextlib import contextmanager

load_dotenv()

@contextmanager
def get_db_connection():
        '''
        Context manager for database connections
        this allows the code to be super modular
        and clean, and also handling connection closing and committing automatically
        '''
        con = psycopg2.connect(os.environ.get("DATABASE_URL")) # connect to db using credentials from .env file
        try:
            yield con # give back the con for the block to use 
        finally:
            con.commit() # commit any changes made in the block
            con.close() # close the connection when done for leak prevention

def save_summoner(data: dict):
    '''
    Saves a summoner to db, if the summoner already exists, it updates their info. This is used in the search endpoint to save the searched summoner to the db, and also update their rank info if they are already in the db.
    
    Args: data (dict): Dictionary with the summoner info we will save to db.
    '''
    with get_db_connection() as con: # (one time comment) get a connection from context manager 
        cur = con.cursor()
        
        #below query uses ON CONFLICT, because if summoner exists, we should update their info
        # so in the case of existing summoner, update their game name, tag, and rank info. In the case of new summoner, just insert them as normal
        query = ("""
            INSERT INTO summoners (puuid, game_name, tag, rank_tier, rank_division, lp, wins, losses, profile_icon_id, region)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
            ON CONFLICT (puuid) 
            DO UPDATE SET
                game_name = EXCLUDED.game_name,
                tag = EXCLUDED.tag,
                rank_tier = EXCLUDED.rank_tier,
                rank_division = EXCLUDED.rank_division,
                lp = EXCLUDED.lp,
                wins = EXCLUDED.wins,
                losses = EXCLUDED.losses,
                profile_icon_id = EXCLUDED.profile_icon_id,
                region = EXCLUDED.region
            """)
        # the value is a tuple of the data we want to insert/update, in the same order as the query placeholders
        value = (data['puuid'], data['gameName'], data['tagLine'], data['rankTier'], data['rankDivision'], data['lp'], data['wins'], data['losses'], data['profile_icon_id'], data.get('region', 'na1'))
        cur.execute(query, value)
    
def get_university_id(domain):
    '''
    Gets the UNI_ID from universities table, used in registration to link user to uni 
    Args: domain (str): domain from the user email (eg ku.edu), used to lookup uni_id in universities table
    Returns: int or None: the uni_id if found, None if not found (which we use to prevent registration with emails from unis not in our db)
    '''
    with get_db_connection() as con:
        cur = con.cursor()
        # SQL suffix matching allows subdomains (e.g. mail.usf.edu matches usf.edu)
        query = "SELECT uni_id FROM universities WHERE uni_domain = %s OR %s LIKE '%.' || uni_domain"
        cur.execute(query, (domain, domain)) 
        result = cur.fetchone()
        
        # if there is a result it will give the uni_id, if no result, its None (not allowed to register with email from unis not in our db)
        if result:
            return result[0] 
        else:
            return None

def create_user(email, password_hash, university_id):
    '''
    Creates user in the db, used in registration endpoint after validating email and hashing password.
    Args: 
    email (str): the user's email, 
    password_hash (str): the hashed password
    university_id (int): the university id from get_university_id function, used to link user to uni in db
    return: bool: True if user created successfully, False if there was an error (such as email already existing in db)
    '''
    with get_db_connection() as con:
        cur = con.cursor()
        try:
            # try to insert user into db, email requires uniqueness, so throw error if email already exists (which we catch and return false for registration failure)
            query = "INSERT INTO users (user_email, password_hash, uni_id, is_verified) VALUES (%s, %s, %s, %s)"  
            cur.execute(query, (email, password_hash, university_id, False))  
            return True
        except Exception as e:
            print(f'Error creating user: {e}')
            return False

def calculate_score(tier, division):
    '''
    Calculates the score of a summoner based on their rank tier and division, allows for leaderboard sorting.
    Args: tier (str): The rank tier of the summoner.
          division (str): The rank division of the summoner.
    Returns: int: The calculated score.
    '''
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
    # Ensure tier is uppercase and safely retrieve tier/division values
    tier_upper = tier.upper() if tier else "UNRANKED"
    return Tier_Map.get(tier_upper, 0) + Div_Map.get(division, 0)
def get_leaderboard(uni_id):
    '''
    Gets the leaderboard of summoners for a given university, sorted by score (calculated from rank). If uni_id is 'all', it gets the leaderboard for all universities.
    Args: uni_id (int or str): The university id to get the leaderboard for, or 'all' for all universities.
    Returns: list of dicts: A list of summoners with their info and score, sorted by score in descending order.
    '''
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor) # get results as dicts for ease of use in frontend 
        if uni_id == 'all':
            # all means we want all unis in LB, so no need for WHERE clause to filter by uni_id
            query = """SELECT universities.uni_name, puuid, game_name, rank_tier, rank_division, lp, wins, losses
                    FROM summoners 
                    INNER JOIN users ON summoners.user_id = users.user_id 
                    JOIN universities ON users.uni_id = universities.uni_id"""
            cur.execute(query)        
        else:
            # specific uni means we need to filter by uni_id, so we add a WHERE clause for that
            query = """SELECT universities.uni_name, puuid, game_name, rank_tier, rank_division, lp, wins, losses 
                    FROM summoners 
                    INNER JOIN users ON summoners.user_id = users.user_id 
                    JOIN universities ON users.uni_id = universities.uni_id 
                    WHERE users.uni_id = %s"""
            cur.execute(query, (uni_id,))
        
        summoners = cur.fetchall()
        for summoner in summoners:
            summoner['score'] = calculate_score(summoner['rank_tier'], summoner['rank_division']) # calculate score for each summoner for sorting and frontend display
        # sort the summoners by score in descending order for leaderboard display (highest rank at top)
        sorted_list = sorted(summoners, key=lambda x: x['score'], reverse=True)
        return sorted_list

def get_user_by_email(email):
    '''
    Gets the user data from the database by email, used in login to get the user's hashed password and university id for authentication and frontend use.
    Args: email (str): the user's email, used to lookup the user in the database
    Returns: tuple or None: A tuple containing the user's id, hashed password, and university id if found, None if no user with that email exists (used to prevent login with non-existent email)
    '''
    with get_db_connection() as con:
        cur = con.cursor()
        # simple query to get the user_id, password_hash, and uni_id for the given email, used for authentication and frontend use after login
        query = "SELECT user_id, password_hash, uni_id FROM users WHERE user_email = %s"
        cur.execute(query, (email,))
        data = cur.fetchone()
        return data

def claim_summoner_(user_id, puuid):
    '''
    Claims a summoner for a user, associating the summoner with the user.
    Args: user_id (int): The user_id of the user claiming the summoner.
          puuid (str): The puuid of the summoner to claim.
    Returns: bool: True if the summoner was claimed successfully, False if there was an error.
    '''
    with get_db_connection() as con:
        cur = con.cursor()
        # 1. Clear any prior claimed summoners for this user to respect UNIQUE user_id constraint
        cur.execute("UPDATE summoners SET user_id = NULL WHERE user_id = %s", (user_id,))
        # 2. Clear any prior users claiming this summoner (to avoid steals or unique violation conflicts)
        cur.execute("UPDATE summoners SET user_id = NULL WHERE puuid = %s", (puuid,))
        # 3. Associate user with the summoner
        query = '''
        UPDATE summoners
        SET user_id = %s
        WHERE puuid = %s
        '''
        cur.execute(query, (user_id, puuid))
        return True

def get_summoner_by_user(user_id):
    """This function is used to get the puuid of the summoner associated with a user_id. This is used in the profile page to display the summoner information of the user.

    Args:
        user_id (int): The user_id of the user whose summoner information is to be retrieved.

    Returns:
        str: The puuid of the summoner associated with the user_id.
    """
    with get_db_connection() as con:
        cur = con.cursor()
        # get puuid and region for a user_id, 
        # used in profile page to get the summoner info for the user, and also in refresh endpoint to know which summoner and region to update
        query = '''
        SELECT puuid, region FROM summoners 
        WHERE user_id = %s
        '''
        cur.execute(query, (user_id,))
        data = cur.fetchone()
        return (data[0], data[1]) if data else (None, None)

def update_summoner_rank(puuid, rank_tier, rank_division, lp, wins, losses, profile_icon_id):
    '''
    Updates the rank information of a summoner in the database.
    Args: puuid (str): The puuid of the summoner whose rank information is to be updated.
          rank_tier (str): The new rank tier for the summoner.
          rank_division (str): The new rank division for the summoner.
          lp (int): The new league points for the summoner.
          wins (int): The new number of wins for the summoner.
          losses (int): The new number of losses for the summoner.
    '''
    with get_db_connection() as con:
        cur = con.cursor()
        query = '''
        UPDATE summoners
        SET rank_tier = %s, rank_division = %s, lp = %s, wins = %s, losses = %s, profile_icon_id = %s
        WHERE puuid = %s
        '''
        cur.execute(query, (rank_tier, rank_division, lp, wins, losses, profile_icon_id, puuid))

def get_profile_by_user(user_id):
    '''
    Gets the full summoner profile for a specific user.
    '''
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT puuid, game_name, tag, rank_tier, rank_division, lp, wins, losses, profile_icon_id, region
            FROM summoners 
            WHERE user_id = %s
        """
        cur.execute(query, (user_id,))
        return cur.fetchone()

# --- Verification & Security Extensions ---

def init_db():
    '''
    Initializes database verification structures dynamically on startup
    '''
    with get_db_connection() as con:
        cur = con.cursor()
        # Add email verification code columns to users table
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6)")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMP")
        
        # Add region column to summoners table
        cur.execute("ALTER TABLE summoners ADD COLUMN IF NOT EXISTS region VARCHAR(8) DEFAULT 'na1'")
        
        # Create pending_claims table for Riot summoner third party verification
        cur.execute("""
            CREATE TABLE IF NOT EXISTS pending_claims (
                user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                puuid VARCHAR NOT NULL,
                verification_code VARCHAR(32) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, puuid)
            )
        """)

def set_user_verification_code(user_id, code, expires_at):
    with get_db_connection() as con:
        cur = con.cursor()
        query = """
            UPDATE users 
            SET verification_code = %s, verification_code_expires = %s 
            WHERE user_id = %s
        """
        cur.execute(query, (code, expires_at, user_id))

def get_user_verification(user_id):
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        query = "SELECT user_email, is_verified, verification_code, verification_code_expires FROM users WHERE user_id = %s"
        cur.execute(query, (user_id,))
        return cur.fetchone()

def verify_user_email(user_id):
    with get_db_connection() as con:
        cur = con.cursor()
        cur.execute("UPDATE users SET is_verified = TRUE, verification_code = NULL, verification_code_expires = NULL WHERE user_id = %s", (user_id,))

def create_pending_claim(user_id, puuid, code):
    with get_db_connection() as con:
        cur = con.cursor()
        query = """
            INSERT INTO pending_claims (user_id, puuid, verification_code) 
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, puuid) 
            DO UPDATE SET verification_code = EXCLUDED.verification_code, created_at = CURRENT_TIMESTAMP
        """
        cur.execute(query, (user_id, puuid, code))

def get_pending_claim(user_id, puuid):
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        query = "SELECT verification_code FROM pending_claims WHERE user_id = %s AND puuid = %s"
        cur.execute(query, (user_id, puuid))
        return cur.fetchone()

def delete_pending_claim(user_id, puuid):
    with get_db_connection() as con:
        cur = con.cursor()
        cur.execute("DELETE FROM pending_claims WHERE user_id = %s AND puuid = %s", (user_id, puuid))

def get_university_leaderboard():
    '''
    Aggregates standings for all universities based on player statistics.
    Returns: list of dicts: A list of universities sorted by their aggregated total power score.
    '''
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        # Calculates combined power score per school using the same weights as calculate_score
        # We explicitly CAST values to INTEGER to prevent JSON serialization errors (e.g. Decimal mapping) in Flask
        query = """
            SELECT 
                u.uni_id,
                u.uni_name,
                u.uni_domain,
                COALESCE(u.uni_logo_link, 'https://logo.clearbit.com/' || u.uni_domain) as uni_logo_link,
                CAST(COUNT(s.summoner_id) AS INTEGER) as competitor_count,
                CAST(COALESCE(SUM(
                    CASE s.rank_tier
                        WHEN 'UNRANKED' THEN 0
                        WHEN 'IRON' THEN 0
                        WHEN 'BRONZE' THEN 400
                        WHEN 'SILVER' THEN 800
                        WHEN 'GOLD' THEN 1200
                        WHEN 'PLATINUM' THEN 1600
                        WHEN 'EMERALD' THEN 2000
                        WHEN 'DIAMOND' THEN 2400
                        WHEN 'MASTER' THEN 2800
                        WHEN 'GRANDMASTER' THEN 3200
                        WHEN 'CHALLENGER' THEN 3600
                        ELSE 0
                    END + 
                    CASE s.rank_division
                        WHEN 'IV' THEN 0
                        WHEN 'III' THEN 100
                        WHEN 'II' THEN 200
                        WHEN 'I' THEN 300
                        ELSE 0
                    END + 
                    COALESCE(s.lp, 0)
                ), 0) AS INTEGER) as total_power_score
            FROM universities u
            LEFT JOIN users us ON u.uni_id = us.uni_id
            LEFT JOIN summoners s ON us.user_id = s.user_id
            GROUP BY u.uni_id, u.uni_name, u.uni_domain, u.uni_logo_link
            ORDER BY total_power_score DESC
        """
        cur.execute(query)
        return cur.fetchall()

def get_university_details(uni_id):
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT uni_id, uni_name, uni_domain, COALESCE(uni_logo_link, 'https://logo.clearbit.com/' || uni_domain) as uni_logo_link FROM universities WHERE uni_id = %s", (uni_id,))
        return cur.fetchone()

def get_university_summoners(uni_id):
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT puuid, game_name, tag, region 
            FROM summoners 
            INNER JOIN users ON summoners.user_id = users.user_id 
            WHERE users.uni_id = %s
        """
        cur.execute(query, (uni_id,))
        return cur.fetchall()