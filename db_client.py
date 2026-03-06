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
        con = psycopg2.connect(
            host = os.getenv("DB_HOST"),
            database = os.getenv("DB_NAME"),
            user = os.getenv("DB_USER"),
            port = os.getenv("DB_PORT"),
            password = os.getenv("DB_PASS")
        ) # connect to db using credentials from .env file
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
        # the value is a tuple of the data we want to insert/update, in the same order as the query placeholders
        value = (data['puuid'], data['gameName'], data['tagLine'], data['rankTier'], data['rankDivision'], data['lp'])
        cur.execute(query, value)
    
def get_university_id(domain):
    '''
    Gets the UNI_ID from universities table, used in registration to link user to uni 
    Args: domain (str): domain from the user email (eg ku.edu), used to lookup uni_id in universities table
    Returns: int or None: the uni_id if found, None if not found (which we use to prevent registration with emails from unis not in our db)
    '''
    with get_db_connection() as con:
        cur = con.cursor()
        # simple query, get uni_id that matches the domain
        query = "SELECT uni_id FROM universities WHERE uni_domain = %s"
        cur.execute(query, (domain,)) 
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
    return Tier_Map[tier] + Div_Map.get(division, 0) # if division is N/A (for unranked), it will default to 0
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
            query = """SELECT universities.uni_name, puuid, game_name, rank_tier, rank_division, lp 
                    FROM summoners 
                    INNER JOIN users ON summoners.user_id = users.user_id 
                    JOIN universities ON users.uni_id = universities.uni_id"""
            cur.execute(query)        
        else:
            # specific uni means we need to filter by uni_id, so we add a WHERE clause for that
            query = """SELECT universities.uni_name, puuid, game_name, rank_tier, rank_division, lp 
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
        # simple query to update the summoner's user_id to the claiming user's id, effectively claiming the summoner for that user. This allows us to link the summoner to the user in the database for future retrieval and display in profile and leaderboard.
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
        # get puuid for a user_id, 
        # used in profile page to get the summoner info for the user, and also in refresh endpoint to get the puuid to know which summoner to update the rank info for
        query = '''
        SELECT puuid FROM summoners 
        WHERE user_id = %s
        '''
        cur.execute(query, (user_id,))
        data = cur.fetchone()
        return data[0]

def update_summoner_rank(puuid, rank_tier, rank_division, lp):
    '''
    Updates the rank information of a summoner in the database.
    Args: puuid (str): The puuid of the summoner whose rank information is to be updated.
          rank_tier (str): The new rank tier for the summoner.
          rank_division (str): The new rank division for the summoner.
          lp (int): The new league points for the summoner.
    '''
    with get_db_connection() as con:
        cur = con.cursor()
        query = '''
        UPDATE summoners
        SET rank_tier = %s, rank_division = %s, lp = %s
        WHERE puuid = %s
        '''
        cur.execute(query, (rank_tier, rank_division, lp, puuid))