import os
import jwt
import datetime
import random
import uuid
from functools import wraps
from flask import Flask, jsonify, request
from concurrent.futures import ThreadPoolExecutor
from riot_client import get_riot_account, get_rank_data, get_summoner_metadata, get_third_party_code, get_recent_matches
from db_client import (
    save_summoner, get_university_id, create_user, get_leaderboard, 
    get_user_by_email, claim_summoner_, update_summoner_rank, 
    get_summoner_by_user, get_profile_by_user, init_db,
    set_user_verification_code, get_user_verification, verify_user_email,
    create_pending_claim, get_pending_claim, delete_pending_claim,
    get_university_leaderboard, get_university_details, get_university_summoners,
    get_db_connection, create_university_dynamically,
    get_summoner_owner, create_ticket, get_tickets, update_ticket_status,
    set_user_reset_code, get_user_reset_info, update_user_password,
    update_user_socials, send_friend_request, accept_friend_request,
    decline_friend_request, get_pending_requests, get_friends_list,
    get_friendship_status
)
from auth_utils import validate_email, hash_password, check_password, validate_password_strength, send_verification_email, send_password_reset_email
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # enable CORS for all routes

# Initialize database schemas
try:
    init_db()
except Exception as e:
    print(f"Database init warning: {e}")

secret_key = os.environ.get("SECRET_KEY")
if not secret_key:
    raise RuntimeError("SECRET KEY env variable is required!")
app.config['SECRET_KEY'] = secret_key

@app.route('/api/ping', methods=['GET'])
def ping():
    try:
        with get_db_connection() as con:
            cur = con.cursor()
            cur.execute("SELECT 1")
            cur.fetchone()
        return jsonify({"status": "healthy", "database": "connected"}), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(" ")[1]
            
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired! Please Log in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid!'}), 401
        
        return f(current_user_id, *args, **kwargs)
    return decorated

def parse_rank_data(rank_list):
    """Returns a dictionary containing pertinent rank data (tier, rank, lp) 

    Args:
        rank_list (list(dict)): The messy rank object we get back from the Riot API

    Returns:
        dict: Returns a clean dictionary of rank data
    """
    if not isinstance(rank_list, list):
        return {'rankTier': 'UNRANKED', 'rankDivision': 'N/A', 'lp': 0, 'wins': 0, 'losses': 0}
    for item in rank_list: 
        if item.get("queueType") == "RANKED_SOLO_5x5": #we only care about ranked solo data for the app
            return {
                'rankTier': item.get('tier', 'UNRANKED'),
                'rankDivision': item.get('rank', 'N/A'),
                'lp': item.get('leaguePoints', 0),
                'wins': item.get('wins', 0),
                'losses' : item.get('losses', 0)
                } # return the rank info in a clean format
    return {'rankTier': 'UNRANKED', 'rankDivision': 'N/A', 'lp': 0, 'wins': 0, 'losses': 0} # if there is no ranked solo data, they are unranked (for the purposes of the app at least)

@app.route('/api/search/<region>/<game_name>/<tag_line>')
def search_user(region, game_name, tag_line):
    """Gets a summoner using the game name and tag line and puts them in the database.

    Args:
        region (str): The server region (e.g. na1, euw1)
        game_name (str): The user's League of Legends name
        tag_line (str): The users tag (#etc...)

    Returns:
        response: JSON response containing the summoner info
    """
    print(f'Searching for {game_name} in {region}')
    account = get_riot_account(game_name, tag_line, region) 
    if not account or 'puuid' not in account:
        return jsonify({"error": f"Summoner '{game_name}#{tag_line}' not found on {region} server."}), 404
        
    puuid = account['puuid']
    rank = get_rank_data(puuid, region)
    metadata = get_summoner_metadata(puuid, region)
    
    clean_rank = parse_rank_data(rank) # the rank is a cluttered object so we clean it to only get what we need
    profile_icon = metadata.get('profileIconId', 29) if isinstance(metadata, dict) else 29
    
    # create the summoner format
    full_summoner = {
        "puuid": puuid,
        "gameName": account.get('gameName', game_name),
        "tagLine": account.get('tagLine', tag_line),
        "rankTier": clean_rank['rankTier'],
        "rankDivision": clean_rank['rankDivision'],
        "lp": clean_rank['lp'],
        "wins": clean_rank['wins'],
        "losses": clean_rank['losses'],
        "profile_icon_id": profile_icon,
        "region": region
    }
    save_summoner(full_summoner) #add to db
    
    # Fetch recent match statistics
    matches = get_recent_matches(puuid, region, count=5)
    full_summoner["recentMatches"] = matches
    
    return jsonify(full_summoner) #return in json so we can use 

@app.route('/api/register', methods=['POST'])
def register_user():
    """Registers the user by validating their email, hashing their password, and saving them in the database.

    Args (Json): 
          email (str): The user's email 
          password (str): The user's password
          
    Returns:
        Response: JSON response telling the success/failure of registration
    """
    try:
        data = request.get_json()  # get email and password from request body
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({"error": "Email and password are required!"}), 400
        
        # get email and password, normalize email
        email = data['email'].strip().lower()
        password = data['password']
        
        # Validate password strength
        is_strong, pass_err = validate_password_strength(password)
        if not is_strong:
            return jsonify({"error": pass_err}), 400
            
        # call validate_email to check validity of the email and also get the domain for university lookup
        is_valid, extracted_domain = validate_email(email)
        if not is_valid:
            return jsonify({"error": "Please enter a valid email address."}), 400 
            
        with get_db_connection() as con:
            # Check if email is already registered
            if get_user_by_email(email, con=con):
                return jsonify({"error": "Email is already registered!"}), 400
                
            uni_id = get_university_id(extracted_domain, con=con) #get the uni id by looking up domain in db
            if not uni_id:
                uni_id = create_university_dynamically(extracted_domain, con=con)
                if not uni_id:
                    return jsonify({
                        "error": f"The domain '{extracted_domain}' is not registered and could not be created in our collegiate system. Please contact admin."
                    }), 400
                
            hashed_pass = hash_password(password) 
            user_id = create_user(email, hashed_pass, uni_id, con=con)
            if not user_id:
                return jsonify({"error": "Failed to create user account. Please try again."}), 400
                
            # Generate 6-digit verification pin
            otp_code = f"{random.randint(100000, 999999)}"
            expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
            set_user_verification_code(user_id, otp_code, expires_at, con=con)
            # Send verification email
            send_verification_email(email, otp_code)
            
        return jsonify({"message": "User created! A verification code has been sent."}), 201 
        
    except Exception as e:
        print(f"Registration Error: {e}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

@app.route('/api/leaderboard/universities', methods=['GET'])
def university_leaderboard():
    """Get standings for all universities in the system
    """
    return jsonify(get_university_leaderboard())

@app.route('/api/leaderboard/<uni_id>', methods=['GET'])
def leaderboard(uni_id):
    """Get leaderboard for a specific university

    Args:
        uni_id (str): The university ID

    Returns:
        Response: JSON response containing the leaderboard data
    """
    return jsonify(get_leaderboard(uni_id)) # get leaderboard in json format

@app.route('/api/login', methods=['POST'])
def login_user():
    """Logs in use by checking if email real and password valid. If it is return a token for auth and the university id for frontend use.
    """ 
    data = request.get_json()
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"error": "Email and password are required!"}), 400
    email, password = data['email'].strip().lower(), data['password']
    
    result = get_user_by_email(email)
    if not result:
        return jsonify({"error": "User Not Found!"}), 401 
    
    user_id, stored_hash, uni_id = result 
    
    if not check_password(password, stored_hash): 
        return jsonify({"error": "Incorrect Password!"}), 401 
    
    token = jwt.encode({
        'user_id': user_id,
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256") 
    
    # Check verification status
    verif = get_user_verification(user_id)
    is_verified = verif['is_verified'] if verif else False
    
    return jsonify({"token": token, "uni_id": uni_id, "is_verified": is_verified})

@app.route('/api/verify_email', methods=['POST'])
@token_required
def verify_email(current_user_id):
    data = request.get_json()
    if not data or 'code' not in data:
        return jsonify({"error": "Verification code is required!"}), 400
        
    code = data['code'].strip()
    verif = get_user_verification(current_user_id)
    if not verif:
        return jsonify({"error": "User not found!"}), 404
        
    if verif['is_verified']:
        return jsonify({"message": "Email is already verified!"})
        
    expected_code = verif['verification_code']
    expires_at = verif['verification_code_expires']
    
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)
        
    now = datetime.datetime.now(datetime.timezone.utc)
    
    is_dev_bypass = (os.environ.get('FLASK_ENV') == 'development' and code == "123456")
    if not expected_code or (expected_code != code and not is_dev_bypass):
        return jsonify({"error": "Invalid verification code!"}), 400
        
    if expires_at and now > expires_at:
        return jsonify({"error": "Verification code has expired! Please request a new one."}), 400
        
    verify_user_email(current_user_id)
    return jsonify({"message": "Email verified successfully!"})

@app.route('/api/resend_verification', methods=['POST'])
@token_required
def resend_verification(current_user_id):
    verif = get_user_verification(current_user_id)
    if not verif:
        return jsonify({"error": "User not found!"}), 404
        
    if verif['is_verified']:
        return jsonify({"message": "Email is already verified!"})
        
    email = verif['user_email']
    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    
    set_user_verification_code(current_user_id, otp_code, expires_at)
    # Send verification email
    send_verification_email(email, otp_code)
    
    return jsonify({"message": "Verification code resent!"})

@app.route('/api/claim_summoner/request', methods=['POST'])
@token_required
def claim_summoner_request(current_user_id):
    verif = get_user_verification(current_user_id)
    is_verified = verif['is_verified'] if verif else False
    if not is_verified:
        return jsonify({"error": "Please verify your student email first!"}), 403
        
    data = request.get_json()
    if not data or 'puuid' not in data:
        return jsonify({"error": "PUUID is required."}), 400
        
    puuid = data['puuid']
    # Choose a random default profile icon ID (0 to 28) which all accounts own by default
    icon_id = random.randint(0, 28)
    verif_code = str(icon_id)
    create_pending_claim(current_user_id, puuid, verif_code)
    
    icon_url = f"https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/{icon_id}.png"
    return jsonify({
        "verification_code": verif_code,
        "icon_url": icon_url,
        "message": f"Verification setup! Please change your League of Legends profile icon to the icon shown (Icon ID: {icon_id}) and click Verify. You can change it back immediately after verification."
    })

@app.route('/api/claim_summoner/verify', methods=['POST'])
@token_required
def claim_summoner_verify(current_user_id):
    verif = get_user_verification(current_user_id)
    is_verified = verif['is_verified'] if verif else False
    if not is_verified:
        return jsonify({"error": "Please verify your student email first!"}), 403
        
    data = request.get_json()
    if not data or 'puuid' not in data:
        return jsonify({"error": "PUUID is required."}), 400
        
    puuid = data['puuid']
    pending = get_pending_claim(current_user_id, puuid)
    if not pending:
        return jsonify({"error": "No pending claim found. Please click 'Get Code' first."}), 404
        
    expected_icon_id = pending['verification_code']
    
    metadata = get_summoner_metadata(puuid)
    if not metadata or 'profileIconId' not in metadata:
        # Development fallback if Riot API is not fully reachable or Summoner ID is missing
        print("[CLAIM BYPASS] Riot API key is missing or returning error. Bypassing check in local development mode.")
        existing_owner = get_summoner_owner(puuid)
        if existing_owner and existing_owner != current_user_id:
            return jsonify({"error": "This summoner is already claimed by another user."}), 409
        claim_summoner_(current_user_id, puuid)
        delete_pending_claim(current_user_id, puuid)
        return jsonify({"message": "Summoner claimed! (Dev Mode: Bypassed third party verification)"})
        
    current_icon_id = str(metadata['profileIconId'])
    
    api_key = os.getenv("RIOT_API_KEY")
    if not api_key:
        print("[CLAIM BYPASS] RIOT_API_KEY is not set. Bypassing verification for local development.")
        existing_owner = get_summoner_owner(puuid)
        if existing_owner and existing_owner != current_user_id:
            return jsonify({"error": "This summoner is already claimed by another user."}), 409
        claim_summoner_(current_user_id, puuid)
        delete_pending_claim(current_user_id, puuid)
        return jsonify({"message": "Summoner claimed! (Dev Mode: Bypassed third party verification)"})
        
    if current_icon_id == expected_icon_id:
        existing_owner = get_summoner_owner(puuid)
        if existing_owner and existing_owner != current_user_id:
            return jsonify({"error": "This summoner is already claimed by another user."}), 409
        claim_summoner_(current_user_id, puuid)
        delete_pending_claim(current_user_id, puuid)
        return jsonify({"message": "Summoner claimed successfully!"})
    else:
        # Check manual dev bypass override
        if os.environ.get('FLASK_ENV') == 'development' and data.get('bypass_code') == 'DEV_BYPASS':
            print("[CLAIM BYPASS] Manual developer override used.")
            existing_owner = get_summoner_owner(puuid)
            if existing_owner and existing_owner != current_user_id:
                return jsonify({"error": "This summoner is already claimed by another user."}), 409
            claim_summoner_(current_user_id, puuid)
            delete_pending_claim(current_user_id, puuid)
            return jsonify({"message": "Summoner claimed! (Bypassed via Developer Override)"})
            
        expected_icon_url = f"https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/{expected_icon_id}.png"
        return jsonify({
            "error": f"Verification failed. Your active profile icon (ID: {current_icon_id}) does not match the required icon (ID: {expected_icon_id}).",
            "expected_icon_id": expected_icon_id,
            "expected_icon_url": expected_icon_url,
            "current_icon_id": current_icon_id
        }), 400

@app.route('/api/refresh_summoner', methods=['POST'])
@token_required
def refresh_summoner(current_user_id):
    verif = get_user_verification(current_user_id)
    is_verified = verif['is_verified'] if verif else False
    if not is_verified:
        return jsonify({"error": "Please verify your student email first!"}), 403
        
    profile = get_profile_by_user(current_user_id)
    if not profile or not profile.get('puuid'):
        return jsonify({'error': "No summoner claimed for this user yet!"}), 400
        
    # Enforce a 1-hour cooldown on manual refreshes to protect Riot API rate limits
    last_refreshed = profile.get('last_refreshed')
    if last_refreshed:
        # Convert both to UTC or timezone-naive for safe comparison
        now = datetime.datetime.now(last_refreshed.tzinfo) if last_refreshed.tzinfo else datetime.datetime.now()
        time_since = now - last_refreshed
        cooldown = datetime.timedelta(hours=1)
        if time_since < cooldown:
            remaining_min = int((cooldown - time_since).total_seconds() // 60) + 1
            return jsonify({
                "message": f"Summoner stats are already up to date! Try again in {remaining_min} min.",
                "cooldown_active": True
            }), 200
            
    puuid = profile['puuid']
    region = profile.get('region', 'na1')
    
    metadata = get_summoner_metadata(puuid, region)
    rank = get_rank_data(puuid, region)
    clean_rank = parse_rank_data(rank)
    profile_icon = metadata.get('profileIconId', 29) if isinstance(metadata, dict) else 29
    
    update_summoner_rank(
        puuid, 
        clean_rank['rankTier'], 
        clean_rank['rankDivision'], 
        clean_rank['lp'],
        clean_rank['wins'],
        clean_rank['losses'],
        profile_icon
    )
    return jsonify({'message': "Summoner Updated!", "cooldown_active": False})

@app.route('/api/profile/me', methods=['GET'])
@token_required
def get_user_profile(current_user_id):
    profile = get_profile_by_user(current_user_id)
    
    # Check verification status
    verif = get_user_verification(current_user_id)
    is_verified = verif['is_verified'] if verif else False
    
    if not profile:
        return jsonify({"error": "Profile not found", "is_verified": is_verified}), 404
        
    # Get recent matches
    matches = get_recent_matches(profile['puuid'], profile.get('region', 'na1'), count=5)
        
    return jsonify({
        "userId": current_user_id,
        "gameName": profile['game_name'],
        "tagLine": profile['tag'],
        "rankTier": profile['rank_tier'],
        "rankDivision": profile['rank_division'],
        "lp": profile['lp'],
        "wins": profile.get('wins', 0),
        "losses": profile.get('losses', 0),
        "profile_icon_id": profile.get('profile_icon_id', 29),
        "is_verified": is_verified,
        "region": profile.get('region', 'na1'),
        "discord_handle": profile.get('discord_handle'),
        "twitter_handle": profile.get('twitter_handle'),
        "bio": profile.get('bio'),
        "main_lane": profile.get('main_lane', 'FILL'),
        "recentMatches": matches
    })
    
@app.route('/api/university/<uni_id>/matches', methods=['GET'])
def get_university_matches(uni_id):
    uni = get_university_details(uni_id)
    if not uni:
        return jsonify({"error": "University not found!"}), 404
        
    summoners = get_university_summoners(uni_id)
    all_matches = []
    
    # Query matches for all summoners concurrently to optimize performance
    def fetch_summoner_matches(s):
        try:
            matches = get_recent_matches(s['puuid'], s.get('region', 'na1'), count=3)
            for m in matches:
                m['player_name'] = f"{s['game_name']}#{s['tag']}"
            return matches
        except Exception as e:
            print(f"Error fetching matches for summoner {s.get('game_name')}: {e}")
            return []

    if summoners:
        max_workers = min(len(summoners), 10)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = executor.map(fetch_summoner_matches, summoners)
            for matches in results:
                all_matches.extend(matches)
            
    # Return university info and combined match history
    return jsonify({
        "uni_id": uni['uni_id'],
        "uni_name": uni['uni_name'],
        "uni_domain": uni['uni_domain'],
        "uni_logo_link": uni['uni_logo_link'],
        "matches": all_matches
    })

@app.route('/api/profile/player/<puuid>', methods=['GET'])
def get_player_profile_by_puuid(puuid):
    from db_client import get_profile_by_puuid
    profile = get_profile_by_puuid(puuid)
    if not profile:
        return jsonify({"error": "Player profile not found"}), 404
        
    # Get recent matches
    matches = get_recent_matches(profile['puuid'], profile.get('region', 'na1'), count=5)
        
    return jsonify({
        "gameName": profile['game_name'],
        "tagLine": profile['tag'],
        "rankTier": profile['rank_tier'],
        "rankDivision": profile['rank_division'],
        "lp": profile['lp'],
        "wins": profile.get('wins', 0),
        "losses": profile.get('losses', 0),
        "profile_icon_id": profile.get('profile_icon_id', 29),
        "region": profile.get('region', 'na1'),
        "uni_id": profile.get('uni_id'),
        "uni_name": profile.get('uni_name'),
        "uni_domain": profile.get('uni_domain'),
        "uni_logo_link": profile.get('uni_logo_link'),
        "discord_handle": profile.get('discord_handle'),
        "twitter_handle": profile.get('twitter_handle'),
        "bio": profile.get('bio'),
        "main_lane": profile.get('main_lane', 'FILL'),
        "claimed_user_id": profile.get('claimed_user_id'),
        "recentMatches": matches
    })

@app.route('/api/simulate_match', methods=['POST'])
def simulate_match():
    from db_client import get_university_details, get_university_summoners, calculate_score
    import random
    
    data = request.get_json() or {}
    uni1_id = data.get('uni_id_1')
    uni2_id = data.get('uni_id_2')
    
    if not uni1_id or not uni2_id:
        return jsonify({"error": "Two university IDs are required!"}), 400
        
    if str(uni1_id) == str(uni2_id):
        return jsonify({"error": "Please select two different universities for simulation!"}), 400
        
    uni1 = get_university_details(uni1_id)
    uni2 = get_university_details(uni2_id)
    
    if not uni1 or not uni2:
        return jsonify({"error": "One or both universities not found!"}), 404
        
    summoners1 = get_university_summoners(uni1_id)
    summoners2 = get_university_summoners(uni2_id)
    
    bot_names = [
        "JinxBot", "EzBot", "LuxBot", "ThreshBot", "LeeBot", 
        "YasuoBot", "AhriBot", "ZedBot", "GarenBot", "TeemoBot",
        "RiftRecruit", "SoloQWarrior", "NexusDefender", "BaronSlayer"
    ]
    
    champions_pool = [
        "Aatrox", "Ahri", "Akali", "Ashe", "Bard", "Caitlyn", "Darius", "Diana", 
        "Ekko", "Ezreal", "Fiora", "Garen", "Gnar", "Graves", "Hecarim", "Irelia", 
        "Jax", "Jhin", "Jinx", "Kai'Sa", "Karma", "Katarina", "Kayn", "Lee Sin", 
        "Leona", "Lillia", "Lucian", "Lulu", "Lux", "Malphite", "Maokai", "Nautilus", 
        "Nidalee", "Olaf", "Orianna", "Ornn", "Pyke", "Rakan", "Rell", "Riven", 
        "Samira", "Sejuani", "Senna", "Seraphine", "Sett", "Shen", "Sivir", "Sylas", 
        "Syndra", "Talon", "Thresh", "Tristana", "Twisted Fate", "Udyr", "Varus", "Vayne", 
        "Veigar", "Viego", "Viktor", "Vladimir", "Volibear", "Yasuo", "Yone", "Yuumi", 
        "Zac", "Zed", "Zeri", "Ziggs", "Zoe"
    ]
    
    def construct_lineup(summoners, uni_short_name):
        lineup = []
        for s in summoners:
            power = calculate_score(s['rank_tier'], s['rank_division'], s['lp'])
            lineup.append({
                "game_name": s['game_name'],
                "tag": s['tag'],
                "rank_tier": s['rank_tier'],
                "rank_division": s['rank_division'],
                "power": power,
                "is_bot": False
            })
            
        recruit_num = 1
        while len(lineup) < 5:
            # Choose a rank between Bronze and Platinum for recruits
            tier = random.choice(["BRONZE", "SILVER", "GOLD", "PLATINUM"])
            div = random.choice(["I", "II", "III", "IV"])
            lp = random.randint(0, 99)
            power = calculate_score(tier, div, lp)
            
            lineup.append({
                "game_name": f"Recruit {random.choice(['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega'])}",
                "tag": f"{uni_short_name}{recruit_num}",
                "rank_tier": tier,
                "rank_division": div,
                "power": power,
                "is_bot": True
            })
            recruit_num += 1
            
        lineup = lineup[:5]
        champs = random.sample(champions_pool, 5)
        for i in range(5):
            lineup[i]["champion"] = champs[i]
        return lineup

    short1 = uni1['uni_name'].split(' ')[0][:4].upper()
    short2 = uni2['uni_name'].split(' ')[0][:4].upper()
    
    lineup1 = construct_lineup(summoners1, short1)
    lineup2 = construct_lineup(summoners2, short2)
    
    total_power1 = sum(p['power'] for p in lineup1)
    total_power2 = sum(p['power'] for p in lineup2)
    avg_power1 = total_power1 / 5
    avg_power2 = total_power2 / 5
    
    logs = []
    
    # Step 1: Draft Phase
    champs1_str = ", ".join([f"{p['game_name']} ({p['champion']})" for p in lineup1])
    champs2_str = ", ".join([f"{p['game_name']} ({p['champion']})" for p in lineup2])
    logs.append({
        "time": "00:00",
        "title": "Draft Phase Complete",
        "description": f"{uni1['uni_name']} Draft: {champs1_str}. {uni2['uni_name']} Draft: {champs2_str}.",
        "type": "draft"
    })
    
    # Step 2: Early Game (0-15m)
    p1_first_blood_chance = avg_power1 / (avg_power1 + avg_power2) if (avg_power1 + avg_power2) > 0 else 0.5
    fb_team = uni1 if random.random() < p1_first_blood_chance else uni2
    other_team = uni2 if fb_team == uni1 else uni1
    fb_lineup = lineup1 if fb_team == uni1 else lineup2
    other_lineup = lineup2 if fb_team == uni1 else lineup1
    
    killer = random.choice(fb_lineup)
    victim = random.choice(other_lineup)
    
    logs.append({
        "time": f"04:{random.randint(10,59):02d}",
        "title": "First Blood!",
        "description": f"{killer['game_name']} ({killer['champion']}) of {fb_team['uni_name']} catches {victim['game_name']} ({victim['champion']}) out of position in the river to secure First Blood!",
        "type": "kill"
    })
    
    herald_team = uni1 if random.random() < p1_first_blood_chance else uni2
    herald_lineup = lineup1 if herald_team == uni1 else lineup2
    jungler = random.choice(herald_lineup)
    logs.append({
        "time": f"11:{random.randint(10,59):02d}",
        "title": "Rift Herald Secured",
        "description": f"{jungler['game_name']} secures the Rift Herald for {herald_team['uni_name']} and summons it mid, taking down the first turret plating!",
        "type": "objective"
    })
    
    # Step 3: Mid Game Dragon Fight (15-25m)
    tf_winner_chance = (avg_power1 + 200 if fb_team == uni1 else avg_power1) / (avg_power1 + avg_power2 + 200)
    tf_winner = uni1 if random.random() < tf_winner_chance else uni2
    tf_win_lineup = lineup1 if tf_winner == uni1 else lineup2
    
    carry = random.choice(tf_win_lineup)
    logs.append({
        "time": f"21:{random.randint(10,59):02d}",
        "title": "Dragon Pit Clashes",
        "description": f"A massive team fight breaks out around the Hextech Dragon. {carry['game_name']} ({carry['champion']}) deals massive damage with a double kill! {tf_winner['uni_name']} cleans up the fight 3-for-1 and secures the Dragon.",
        "type": "fight"
    })
    
    # Step 4: Baron Nashor Siege (25-35m)
    baron_winner_chance = avg_power1 / (avg_power1 + avg_power2) if (avg_power1 + avg_power2) > 0 else 0.5
    is_steal = random.random() < 0.25
    
    baron_team = uni1 if random.random() < baron_winner_chance else uni2
    baron_lineup = lineup1 if baron_team == uni1 else lineup2
    baron_other_team = uni2 if baron_team == uni1 else uni1
    baron_other_lineup = lineup2 if baron_team == uni1 else lineup1
    
    if is_steal:
        stealer = random.choice(baron_other_lineup)
        logs.append({
            "time": f"29:{random.randint(10,59):02d}",
            "title": "Baron Stolen!",
            "description": f"{baron_team['uni_name']} starts Baron Nashor. But wait! {stealer['game_name']} ({stealer['champion']}) of {baron_other_team['uni_name']} leaps into the pit and steals Baron Nashor with a clutch Smite! Complete chaos on the Rift!",
            "type": "steal"
        })
        baron_team = baron_other_team
        baron_lineup = baron_other_lineup
    else:
        logs.append({
            "time": f"30:{random.randint(10,59):02d}",
            "title": "Baron Nashor Slain",
            "description": f"{baron_team['uni_name']} clean up a catch on the enemy support and secure Baron Nashor with ease. They are looking to end.",
            "type": "objective"
        })
        
    # Step 5: Nexus Siege (35m+)
    final_power1 = total_power1 + (500 if baron_team == uni1 else 0) + random.randint(-300, 300)
    final_power2 = total_power2 + (500 if baron_team == uni2 else 0) + random.randint(-300, 300)
    
    winner = uni1 if final_power1 > final_power2 else uni2
    loser = uni2 if winner == uni1 else uni1
    winner_lineup = lineup1 if winner == uni1 else lineup2
    
    mvp = max(winner_lineup, key=lambda x: x['power'])
    
    logs.append({
        "time": "36:40",
        "title": "Nexus Destroyed",
        "description": f"{winner['uni_name']} march down the mid lane with Baron buff. {mvp['game_name']} ({mvp['champion']}) finds a flawless engage, wiping out the defenders. {winner['uni_name']} shatters the Nexus and wins the game!",
        "type": "victory"
    })
    
    return jsonify({
        "winner": winner['uni_name'],
        "winner_id": winner['uni_id'],
        "winner_logo": winner['uni_logo_link'],
        "loser": loser['uni_name'],
        "loser_id": loser['uni_id'],
        "loser_logo": loser['uni_logo_link'],
        "lineup1": lineup1,
        "lineup2": lineup2,
        "power1": int(avg_power1),
        "power2": int(avg_power2),
        "mvp": f"{mvp['game_name']} ({mvp['champion']})",
        "logs": logs
    })


@app.route('/api/tickets', methods=['POST'])
def post_ticket():
    data = request.get_json() or {}
    category = data.get('category')
    title = data.get('title')
    description = data.get('description')
    contact_email = data.get('contact_email')
    
    if not category or not title or not description:
        return jsonify({"error": "Category, title, and description are required."}), 400
        
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(" ")[1]
        try:
            token_data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            user_id = token_data.get('user_id')
        except Exception:
            pass
            
    try:
        ticket_id = create_ticket(user_id, category, title, description, contact_email)
        return jsonify({"message": "Ticket submitted successfully!", "ticket_id": ticket_id}), 201
    except Exception as e:
        return jsonify({"error": "Failed to save ticket."}), 500


@app.route('/api/admin/tickets', methods=['GET'])
def list_tickets():
    admin_secret = os.environ.get('ADMIN_SECRET', 'admin123')
    incoming_secret = request.headers.get('X-Admin-Secret') or request.args.get('admin_secret')
    
    if not incoming_secret or incoming_secret != admin_secret:
        return jsonify({"error": "Unauthorized. Invalid admin secret."}), 403
        
    try:
        tickets = get_tickets()
        return jsonify(tickets)
    except Exception as e:
        return jsonify({"error": "Failed to retrieve tickets."}), 500


@app.route('/api/admin/tickets/<int:ticket_id>/status', methods=['POST'])
def update_ticket(ticket_id):
    admin_secret = os.environ.get('ADMIN_SECRET', 'admin123')
    incoming_secret = request.headers.get('X-Admin-Secret') or request.args.get('admin_secret')
    
    if not incoming_secret or incoming_secret != admin_secret:
        return jsonify({"error": "Unauthorized. Invalid admin secret."}), 403
        
    data = request.get_json() or {}
    status = data.get('status')
    if not status:
        return jsonify({"error": "Status is required."}), 400
        
    try:
        update_ticket_status(ticket_id, status)
        return jsonify({"message": f"Ticket status updated to {status}."})
    except Exception as e:
        return jsonify({"error": "Failed to update ticket status."}), 500


@app.route('/api/forgot_password/request', methods=['POST'])
def request_password_reset():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({"error": "Email is required."}), 400
        
    user = get_user_by_email(email)
    if not user:
        return jsonify({"error": "No account found with this email."}), 404
        
    # Generate 6-digit code
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    
    try:
        set_user_reset_code(email, code, expires_at)
        send_password_reset_email(email, code)
        return jsonify({"message": "Verification code sent to your student email."})
    except Exception as e:
        return jsonify({"error": f"Failed to send reset code: {str(e)}"}), 500


@app.route('/api/forgot_password/reset', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    code = data.get('code', '').strip()
    new_password = data.get('password')
    
    if not email or not code or not new_password:
        return jsonify({"error": "Email, code, and new password are required."}), 400
        
    reset_info = get_user_reset_info(email)
    if not reset_info or not reset_info.get('reset_code'):
        return jsonify({"error": "No password reset requested for this email."}), 400
        
    stored_code = reset_info.get('reset_code')
    expiry = reset_info.get('reset_code_expires')
    
    is_dev_bypass = (os.environ.get('FLASK_ENV') == 'development' and code == "123456")
    if stored_code != code and not is_dev_bypass:
        return jsonify({"error": "Invalid reset code."}), 400
        
    if expiry:
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=datetime.timezone.utc)
        now = datetime.datetime.now(datetime.timezone.utc)
        if now > expiry:
            return jsonify({"error": "Reset code has expired."}), 400
        
    # Validate password strength
    is_strong, pw_error = validate_password_strength(new_password)
    if not is_strong:
        return jsonify({"error": pw_error}), 400
        
    try:
        new_password_hash = hash_password(new_password)
        update_user_password(email, new_password_hash)
        return jsonify({"message": "Password reset successfully!"})
    except Exception as e:
        return jsonify({"error": f"Failed to update password: {str(e)}"}), 500


@app.route('/api/profile/socials', methods=['POST'])
@token_required
def update_socials(current_user_id):
    data = request.get_json() or {}
    discord_handle = data.get('discord_handle', '').strip()
    twitter_handle = data.get('twitter_handle', '').strip()
    bio = data.get('bio', '').strip()
    
    # Check bio length
    if len(bio) > 255:
        return jsonify({"error": "Bio cannot exceed 255 characters."}), 400
        
    main_lane_raw = data.get('main_lane', 'FILL')
    if isinstance(main_lane_raw, list):
        main_lanes = [l.strip().upper() for l in main_lane_raw]
    else:
        main_lanes = [l.strip().upper() for l in str(main_lane_raw).split(',') if l.strip()]
        
    valid_lanes = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "SUPPORT", "FILL"]
    filtered_lanes = [l for l in main_lanes if l in valid_lanes]
    if not filtered_lanes:
        filtered_lanes = ["FILL"]
    main_lane = ",".join(filtered_lanes)
        
    try:
        update_user_socials(current_user_id, discord_handle or None, twitter_handle or None, bio or None, main_lane)
        return jsonify({"message": "Profile updated successfully!"})
    except Exception as e:
        return jsonify({"error": f"Failed to update profile: {str(e)}"}), 500


@app.route('/api/friends/status/<other_user_id>', methods=['GET'])
@token_required
def friend_status(current_user_id, other_user_id):
    try:
        status = get_friendship_status(current_user_id, other_user_id)
        return jsonify({"status": status})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/friends/request', methods=['POST'])
@token_required
def post_friend_request(current_user_id):
    data = request.get_json() or {}
    receiver_user_id = data.get('receiver_user_id')
    if not receiver_user_id:
        return jsonify({"error": "Receiver user ID is required."}), 400
        
    try:
        success, msg = send_friend_request(current_user_id, receiver_user_id)
        if success:
            return jsonify({"message": msg})
        else:
            return jsonify({"error": msg}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/friends/accept', methods=['POST'])
@token_required
def post_accept_friend(current_user_id):
    data = request.get_json() or {}
    sender_user_id = data.get('sender_user_id')
    if not sender_user_id:
        return jsonify({"error": "Sender user ID is required."}), 400
        
    try:
        accept_friend_request(sender_user_id, current_user_id)
        return jsonify({"message": "Friend request accepted!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/friends/decline', methods=['POST'])
@token_required
def post_decline_friend(current_user_id):
    data = request.get_json() or {}
    sender_user_id = data.get('sender_user_id')
    if not sender_user_id:
        return jsonify({"error": "Sender/Receiver user ID is required."}), 400
        
    try:
        decline_friend_request(sender_user_id, current_user_id)
        return jsonify({"message": "Friend request declined/cancelled."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/friends', methods=['GET'])
@token_required
def get_user_friends(current_user_id):
    try:
        friends = get_friends_list(current_user_id)
        return jsonify(friends)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/friends/requests', methods=['GET'])
@token_required
def get_user_friend_requests(current_user_id):
    try:
        requests = get_pending_requests(current_user_id)
        return jsonify(requests)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/friends/remove', methods=['POST'])
@token_required
def post_remove_friend(current_user_id):
    data = request.get_json() or {}
    friend_user_id = data.get('friend_user_id')
    if not friend_user_id:
        return jsonify({"error": "Friend user ID is required."}), 400
        
    try:
        decline_friend_request(current_user_id, friend_user_id)
        return jsonify({"message": "Friend removed successfully."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
