import os
import jwt
import datetime
import random
import uuid
from functools import wraps
from flask import Flask, jsonify, request
from riot_client import get_riot_account, get_rank_data, get_summoner_metadata, get_third_party_code, get_recent_matches
from db_client import (
    save_summoner, get_university_id, create_user, get_leaderboard, 
    get_user_by_email, claim_summoner_, update_summoner_rank, 
    get_summoner_by_user, get_profile_by_user, init_db,
    set_user_verification_code, get_user_verification, verify_user_email,
    create_pending_claim, get_pending_claim, delete_pending_claim,
    get_university_leaderboard, get_university_details, get_university_summoners
)
from auth_utils import validate_email, hash_password, check_password, validate_password_strength
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
        return jsonify({"error": "Not valid email"}), 400 
    uni_id = get_university_id(extracted_domain) #get the uni id by looking up domain in db
    if not uni_id:
        return jsonify({"error": "Not valid university id"}), 400 # if no uni id is found, return (bad request)
    hashed_pass = hash_password(password) 
    user = create_user(email, hashed_pass, uni_id)
    if not user:
        return jsonify({"error": "Not valid User"}), 400 # if user creation fails for some reason, return (bad request)
        
    # Fetch user_id for verification code linkage
    user_data = get_user_by_email(email)
    if user_data:
        user_id = user_data[0]
        # Generate 6-digit verification pin
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
        set_user_verification_code(user_id, otp_code, expires_at)
        
        # Simulate sending verification email
        print(f"\n=======================================================")
        print(f"[EMAIL SIMULATION] To: {email}")
        print(f"[EMAIL SIMULATION] Verification Code: {otp_code}")
        print(f"=======================================================\n")
        
    return jsonify({"message": "User created! A verification code has been sent."}), 201 

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
    
    if not expected_code or expected_code != code:
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
    print(f"\n=======================================================")
    print(f"[EMAIL SIMULATION RESEND] To: {email}")
    print(f"[EMAIL SIMULATION RESEND] Verification Code: {otp_code}")
    print(f"=======================================================\n")
    
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
    verif_code = f"UNI-{uuid.uuid4().hex[:6].upper()}"
    create_pending_claim(current_user_id, puuid, verif_code)
    
    return jsonify({
        "verification_code": verif_code,
        "message": "Verification code generated! Please set this code under Settings -> Verification in your LoL client."
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
        
    expected_code = pending['verification_code']
    
    metadata = get_summoner_metadata(puuid)
    if not metadata or 'id' not in metadata:
        # Development fallback if Riot API is not fully reachable or Summoner ID is missing
        print("[CLAIM BYPASS] Riot API key is missing or returning error. Bypassing check in local development mode.")
        claim_summoner_(current_user_id, puuid)
        delete_pending_claim(current_user_id, puuid)
        return jsonify({"message": "Summoner claimed! (Dev Mode: Bypassed third party verification)"})
        
    summoner_id = metadata['id']
    actual_code = get_third_party_code(summoner_id)
    
    api_key = os.getenv("RIOT_API_KEY")
    if not api_key:
        print("[CLAIM BYPASS] RIOT_API_KEY is not set. Bypassing verification for local development.")
        claim_summoner_(current_user_id, puuid)
        delete_pending_claim(current_user_id, puuid)
        return jsonify({"message": "Summoner claimed! (Dev Mode: Bypassed third party verification)"})
        
    if actual_code == expected_code:
        claim_summoner_(current_user_id, puuid)
        delete_pending_claim(current_user_id, puuid)
        return jsonify({"message": "Summoner claimed successfully!"})
    else:
        # Check manual dev bypass override
        if data.get('bypass_code') == 'DEV_BYPASS':
            print("[CLAIM BYPASS] Manual developer override used.")
            claim_summoner_(current_user_id, puuid)
            delete_pending_claim(current_user_id, puuid)
            return jsonify({"message": "Summoner claimed! (Bypassed via Developer Override)"})
            
        return jsonify({
            "error": "Verification code mismatch on Riot client.",
            "expected_code": expected_code,
            "actual_code": actual_code or "(None found)"
        }), 400

@app.route('/api/refresh_summoner', methods=['POST'])
@token_required
def refresh_summoner(current_user_id):
    verif = get_user_verification(current_user_id)
    is_verified = verif['is_verified'] if verif else False
    if not is_verified:
        return jsonify({"error": "Please verify your student email first!"}), 403
        
    puuid, region = get_summoner_by_user(current_user_id)
    if not puuid:
        return jsonify({'error': "No summoner claimed for this user yet!"}), 400
        
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
    return jsonify({'message': "Summoner Updated!"})

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
        "recentMatches": matches
    })
    
@app.route('/api/university/<uni_id>/matches', methods=['GET'])
def get_university_matches(uni_id):
    uni = get_university_details(uni_id)
    if not uni:
        return jsonify({"error": "University not found!"}), 404
        
    summoners = get_university_summoners(uni_id)
    all_matches = []
    for s in summoners:
        matches = get_recent_matches(s['puuid'], s.get('region', 'na1'), count=3)
        for m in matches:
            m['player_name'] = f"{s['game_name']}#{s['tag']}"
            all_matches.append(m)
            
    # Return university info and combined match history
    return jsonify({
        "uni_id": uni['uni_id'],
        "uni_name": uni['uni_name'],
        "uni_domain": uni['uni_domain'],
        "uni_logo_link": uni['uni_logo_link'],
        "matches": all_matches
    })

if __name__ == '__main__':
    app.run(debug=True)
