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
        con.commit() # commit any changes made in the block
    except Exception:
        con.rollback()
        raise
    finally:
        con.close() # close the connection when done for leak prevention

@contextmanager
def db_session(con=None):
    '''
    Context manager for database operations to reuse an existing connection or open a new one.
    '''
    if con is not None:
        yield con
    else:
        with get_db_connection() as new_con:
            yield new_con

def get_candidate_domains(domain: str):
    '''
    Given a domain like "sub.dept.usf.edu", returns a list of candidate domains:
    ['sub.dept.usf.edu', 'dept.usf.edu', 'usf.edu']
    '''
    parts = domain.split('.')
    candidates = []
    # keep suffixes with at least 2 parts (e.g. usf.edu, not edu)
    for i in range(len(parts) - 1):
        candidates.append('.'.join(parts[i:]))
    return candidates

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
    
def get_university_id(domain, con=None):
    '''
    Gets the UNI_ID from universities table, used in registration to link user to uni 
    Args: domain (str): domain from the user email (eg ku.edu), used to lookup uni_id in universities table
    Returns: int or None: the uni_id if found, None if not found (which we use to prevent registration with emails from unis not in our db)
    '''
    if not domain:
        return None
    candidates = get_candidate_domains(domain)
    if not candidates:
        return None
        
    with db_session(con) as session_con:
        cur = session_con.cursor()
        # Optimize by using ANY with B-tree index lookup instead of LIKE '%.' || uni_domain full-table scans
        query = "SELECT uni_id, uni_domain FROM universities WHERE uni_domain = ANY(%s)"
        cur.execute(query, (candidates,))
        results = cur.fetchall()
        
        if not results:
            return None
            
        parsed_results = []
        for row in results:
            if isinstance(row, dict):
                uni_id = row.get('uni_id')
                uni_domain = row.get('uni_domain')
            elif hasattr(row, 'keys') and hasattr(row, 'values'):
                uni_id = row['uni_id']
                uni_domain = row['uni_domain']
            elif isinstance(row, (tuple, list)):
                uni_id = row[0]
                uni_domain = row[1] if len(row) > 1 else None
            else:
                continue
            parsed_results.append((uni_id, uni_domain))
            
        parsed_results = [r for r in parsed_results if r[0] is not None]
        if not parsed_results:
            return None
            
        # Select the most specific match (longest domain name matching)
        parsed_results.sort(key=lambda x: len(x[1]) if x[1] else 0, reverse=True)
        return parsed_results[0][0]

def create_user(email, password_hash, university_id, con=None):
    '''
    Creates user in the db, used in registration endpoint after validating email and hashing password.
    Args: 
    email (str): the user's email, 
    password_hash (str): the hashed password
    university_id (int): the university id from get_university_id function, used to link user to uni in db
    return: int or None: the user_id if user created successfully, None if there was an error (such as email already existing in db)
    '''
    with db_session(con) as session_con:
        cur = session_con.cursor()
        try:
            # try to insert user into db, email requires uniqueness, so throw error if email already exists (which we catch and return None for registration failure)
            query = "INSERT INTO users (user_email, password_hash, uni_id, is_verified) VALUES (%s, %s, %s, %s) RETURNING user_id"  
            cur.execute(query, (email, password_hash, university_id, False))  
            result = cur.fetchone()
            if not result:
                return None
            if isinstance(result, dict):
                return result.get('user_id')
            elif hasattr(result, 'keys') and hasattr(result, 'values'):
                return result['user_id']
            elif isinstance(result, (tuple, list)):
                return result[0] if len(result) > 0 else None
            return None
        except Exception as e:
            print(f'Error creating user: {e}')
            return None

def calculate_score(tier, division, lp=0):
    '''
    Calculates the score of a summoner based on their rank tier, division, and LP, allows for leaderboard sorting.
    Args: tier (str): The rank tier of the summoner.
          division (str): The rank division of the summoner.
          lp (int): The LP of the summoner.
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
    return Tier_Map.get(tier_upper, 0) + Div_Map.get(division, 0) + (lp or 0)
def get_leaderboard(uni_id):
    '''
    Gets the leaderboard of summoners for a given university, sorted by score (calculated from rank). If uni_id is 'all', it gets the leaderboard for all universities.
    Args: uni_id (int or str): The university id to get the leaderboard for, or 'all' for all universities.
    Returns: list of dicts: A list of summoners with their info and score, sorted by score in descending order.
    '''
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor) # get results as dicts for ease of use in frontend 
        if uni_id == 'all' or uni_id == 'players':
            # all/players means we want all unis in LB, so no need for WHERE clause to filter by uni_id
            query = """SELECT universities.uni_name, puuid, game_name, tag, rank_tier, rank_division, lp, wins, losses, profile_icon_id, region, main_lane
                    FROM summoners 
                    INNER JOIN users ON summoners.user_id = users.user_id 
                    JOIN universities ON users.uni_id = universities.uni_id"""
            cur.execute(query)        
        else:
            # specific uni means we need to filter by uni_id, so we add a WHERE clause for that
            query = """SELECT universities.uni_name, puuid, game_name, tag, rank_tier, rank_division, lp, wins, losses, profile_icon_id, region, main_lane 
                    FROM summoners 
                    INNER JOIN users ON summoners.user_id = users.user_id 
                    JOIN universities ON users.uni_id = universities.uni_id 
                    WHERE users.uni_id = %s"""
            cur.execute(query, (uni_id,))
        
        summoners = cur.fetchall()
        for summoner in summoners:
            summoner['score'] = calculate_score(summoner['rank_tier'], summoner['rank_division'], summoner.get('lp', 0)) # calculate score for each summoner for sorting and frontend display
        # sort the summoners by score in descending order for leaderboard display (highest rank at top)
        sorted_list = sorted(summoners, key=lambda x: x['score'], reverse=True)
        return sorted_list

def get_user_by_email(email, con=None):
    '''
    Gets the user data from the database by email, used in login to get the user's hashed password and university id for authentication and frontend use.
    Args: email (str): the user's email, used to lookup the user in the database
    Returns: tuple or None: A tuple containing the user's id, hashed password, and university id if found, None if no user with that email exists (used to prevent login with non-existent email)
    '''
    with db_session(con) as session_con:
        cur = session_con.cursor()
        # simple query to get the user_id, password_hash, and uni_id for the given email, used for authentication and frontend use after login
        query = "SELECT user_id, password_hash, uni_id FROM users WHERE user_email = %s"
        cur.execute(query, (email,))
        data = cur.fetchone()
        if not data:
            return None
        if isinstance(data, dict):
            return (data.get('user_id'), data.get('password_hash'), data.get('uni_id'))
        elif hasattr(data, 'keys') and hasattr(data, 'values'):
            return (data['user_id'], data['password_hash'], data['uni_id'])
        elif isinstance(data, (tuple, list)):
            user_id = data[0] if len(data) > 0 else None
            password_hash = data[1] if len(data) > 1 else None
            uni_id = data[2] if len(data) > 2 else None
            return (user_id, password_hash, uni_id)
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

def get_summoner_owner(puuid):
    """Return the user_id that currently owns the given summoner, or None."""
    with get_db_connection() as con:
        cur = con.cursor()
        cur.execute("SELECT user_id FROM summoners WHERE puuid = %s", (puuid,))
        row = cur.fetchone()
        if row:
            return row['user_id'] if isinstance(row, dict) else row[0]
        return None

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
        if not data:
            return (None, None)
        if isinstance(data, dict):
            return (data.get('puuid'), data.get('region'))
        elif hasattr(data, 'keys') and hasattr(data, 'values'):
            return (data['puuid'], data['region'])
        elif isinstance(data, (tuple, list)):
            puuid = data[0] if len(data) > 0 else None
            region = data[1] if len(data) > 1 else None
            return (puuid, region)
        return (None, None)

def update_summoner_rank(puuid, rank_tier, rank_division, lp, wins, losses, profile_icon_id):
    '''
    Updates the rank information of a summoner in the database.
    '''
    with get_db_connection() as con:
        cur = con.cursor()
        query = '''
        UPDATE summoners
        SET rank_tier = %s, rank_division = %s, lp = %s, wins = %s, losses = %s, profile_icon_id = %s, last_refreshed = CURRENT_TIMESTAMP
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
            SELECT s.puuid, s.game_name, s.tag, s.rank_tier, s.rank_division, s.lp, s.wins, s.losses, s.profile_icon_id, s.region, s.last_refreshed, s.main_lane,
                   u.discord_handle, u.twitter_handle, u.bio
            FROM summoners s
            INNER JOIN users u ON s.user_id = u.user_id
            WHERE s.user_id = %s
        """
        cur.execute(query, (user_id,))
        return cur.fetchone()

def get_profile_by_puuid(puuid):
    '''
    Gets the full summoner profile by their puuid, including university info.
    '''
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT s.puuid, s.game_name, s.tag, s.rank_tier, s.rank_division, s.lp, s.wins, s.losses, s.profile_icon_id, s.region, s.last_refreshed, s.main_lane,
                   u.uni_id, u.uni_name, u.uni_logo_link, u.uni_domain,
                   us.discord_handle, us.twitter_handle, us.bio
            FROM summoners s
            LEFT JOIN users us ON s.user_id = us.user_id
            LEFT JOIN universities u ON us.uni_id = u.uni_id
            WHERE s.puuid = %s
        """
        cur.execute(query, (puuid,))
        return cur.fetchone()

def update_user_socials(user_id, discord_handle, twitter_handle, bio, main_lane):
    with get_db_connection() as con:
        cur = con.cursor()
        query_users = """
            UPDATE users 
            SET discord_handle = %s, twitter_handle = %s, bio = %s 
            WHERE user_id = %s
        """
        cur.execute(query_users, (discord_handle, twitter_handle, bio, user_id))
        
        query_summoners = """
            UPDATE summoners
            SET main_lane = %s
            WHERE user_id = %s
        """
        cur.execute(query_summoners, (main_lane, user_id))
        return True

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
        
        # Add password reset columns to users table
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code VARCHAR(6)")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMP")
        
        # Add social handles and bio columns to users table
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_handle VARCHAR(100)")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_handle VARCHAR(100)")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(255)")
        
        # Add index on users(uni_id) to optimize university lookups and leaderboard queries
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_uni_id ON users(uni_id)")
        
        # Add region column to summoners table
        cur.execute("ALTER TABLE summoners ADD COLUMN IF NOT EXISTS region VARCHAR(8) DEFAULT 'na1'")
        
        # Add main_lane column to summoners table
        cur.execute("ALTER TABLE summoners ADD COLUMN IF NOT EXISTS main_lane VARCHAR(16) DEFAULT 'FILL'")
        
        # Add last_refreshed column to summoners table
        cur.execute("ALTER TABLE summoners ADD COLUMN IF NOT EXISTS last_refreshed TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        
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
        
        # Create tickets table for bug reports, missing universities, and feedback
        cur.execute("""
            CREATE TABLE IF NOT EXISTS tickets (
                ticket_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
                category VARCHAR(32) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                contact_email VARCHAR(255),
                status VARCHAR(32) DEFAULT 'OPEN',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

def create_ticket(user_id, category, title, description, contact_email):
    """Inserts a new support or feedback ticket."""
    with get_db_connection() as con:
        cur = con.cursor()
        query = """
            INSERT INTO tickets (user_id, category, title, description, contact_email)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING ticket_id
        """
        cur.execute(query, (user_id, category, title, description, contact_email))
        return cur.fetchone()[0]

def get_tickets():
    """Retrieve all feedback/support tickets sorted by submission time."""
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM tickets ORDER BY created_at DESC")
        return cur.fetchall()

def update_ticket_status(ticket_id, status):
    """Updates status of a support ticket (e.g. CLOSED, RESOLVED)."""
    with get_db_connection() as con:
        cur = con.cursor()
        cur.execute("UPDATE tickets SET status = %s WHERE ticket_id = %s", (status, ticket_id))
        return True

def set_user_verification_code(user_id, code, expires_at, con=None):
    with db_session(con) as session_con:
        cur = session_con.cursor()
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

def set_user_reset_code(email, code, expires_at):
    with get_db_connection() as con:
        cur = con.cursor()
        query = """
            UPDATE users 
            SET reset_code = %s, reset_code_expires = %s 
            WHERE LOWER(user_email) = %s
        """
        cur.execute(query, (code, expires_at, email.lower().strip()))
        return True

def get_user_reset_info(email):
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        query = "SELECT reset_code, reset_code_expires FROM users WHERE LOWER(user_email) = %s"
        cur.execute(query, (email.lower().strip(),))
        return cur.fetchone()

def update_user_password(email, new_password_hash):
    with get_db_connection() as con:
        cur = con.cursor()
        query = """
            UPDATE users 
            SET password_hash = %s, reset_code = NULL, reset_code_expires = NULL 
            WHERE LOWER(user_email) = %s
        """
        cur.execute(query, (new_password_hash, email.lower().strip()))
        return True

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
                u.uni_logo_link,
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
        cur.execute("SELECT uni_id, uni_name, uni_domain, uni_logo_link FROM universities WHERE uni_id = %s", (uni_id,))
        return cur.fetchone()

def get_university_summoners(uni_id):
    with get_db_connection() as con:
        cur = con.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT summoners.puuid, summoners.game_name, summoners.tag, summoners.region,
                   summoners.rank_tier, summoners.rank_division, summoners.lp, summoners.profile_icon_id
            FROM summoners 
            INNER JOIN users ON summoners.user_id = users.user_id 
            WHERE users.uni_id = %s
        """
        cur.execute(query, (uni_id,))
        return cur.fetchall()

def fetch_university_name_from_api(domain):
    try:
        import requests
        url = f"http://universities.hipolabs.com/search?domain={domain}"
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                # Find the one that matches domain exactly or take the first name
                return data[0].get("name")
    except Exception as e:
        print(f"Error fetching university name from Hipo Labs API: {e}")
    return None

def create_university_dynamically(domain, con=None):
    '''
    Dynamically creates a university entry based on a new domain.
    Attempts to fetch the official name from Hipo Labs University API first,
    falling back to a local map of popular domains, and then string formatting.
    '''
    official_name = fetch_university_name_from_api(domain)
    
    if not official_name:
        # Fallback local dictionary mapping for popular/problematic domains
        COMMON_UNIVERSITIES = {
            "ksu.edu": "Kansas State University",
            "msu.edu": "Michigan State University",
            "ucf.edu": "University of Central Florida",
            "usf.edu": "University of South Florida",
            "nyu.edu": "New York University",
            "mit.edu": "Massachusetts Institute of Technology",
            "asu.edu": "Arizona State University",
            "fsu.edu": "Florida State University",
            "osu.edu": "Ohio State University",
            "psu.edu": "Penn State University",
            "utexas.edu": "University of Texas at Austin",
            "ufl.edu": "University of Florida",
            "umich.edu": "University of Michigan",
            "berkeley.edu": "UC Berkeley",
            "ucla.edu": "UCLA",
            "stanford.edu": "Stanford University",
            "harvard.edu": "Harvard University"
        }
        official_name = COMMON_UNIVERSITIES.get(domain.lower())
        
    if not official_name:
        # Fallback string parsing
        name_part = domain.split('.')[0]
        if len(name_part) <= 3:
            formatted_name = name_part.upper()
        else:
            formatted_name = name_part.capitalize()
        official_name = f"{formatted_name} University"
        
    logo_link = f"https://www.google.com/s2/favicons?domain={domain}&sz=128"
    
    with db_session(con) as session_con:
        cur = session_con.cursor()
        try:
            query = """
                INSERT INTO universities (uni_name, uni_domain, uni_logo_link)
                VALUES (%s, %s, %s)
                ON CONFLICT (uni_domain) DO UPDATE SET uni_name = EXCLUDED.uni_name
                RETURNING uni_id
            """
            cur.execute(query, (official_name, domain, logo_link))
            row = cur.fetchone()
            if row:
                if isinstance(row, dict):
                    return row.get('uni_id')
                elif isinstance(row, (tuple, list)):
                    return row[0]
            return None
        except Exception as e:
            print(f"Error creating university dynamically: {e}")
            return None