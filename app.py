import os
import jwt
import datetime
from functools import wraps
from flask import Flask, jsonify, request
from riot_client import get_riot_account, get_rank_data
from db_client import save_summoner, get_university_id, create_user, get_leaderboard, get_user_by_email, claim_summoner_, update_summoner_rank, get_summoner_by_user, get_profile_by_user
from auth_utils import validate_email, hash_password, check_password
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # enable CORS for all routes

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'super-secret-dev-key')

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
    for item in rank_list: 
        if item["queueType"] == "RANKED_SOLO_5x5": #we only care about ranked solo data for the app
            return {
                'rankTier': item['tier'],
                'rankDivision': item['rank'],
                'lp': item['leaguePoints'],
                'wins': item['wins'],
                'losses' : item['losses']
                } # return the rank info in a clean format
    return {'rankTier': 'UNRANKED', 'rankDivision': 'N/A', 'lp': 0, 'wins': 0, 'losses': 0} # if there is no ranked solo data, they are unranked (for the purposes of the app at least)

@app.route('/api/search/<game_name>/<tag_line>')
def search_user(game_name, tag_line):
    """Gets a summoner using the game name and tag line and puts them in the database.

    Args:
        game_name (str): The user's League of Legends name
        tag_line (str): The users tag (#etc...)

    Returns:
        response: JSON response containing the summoner info
    """
    print(f'Searching for {game_name}')
    account = get_riot_account(game_name, tag_line) 
    puuid = account['puuid']
    rank = get_rank_data(puuid)
    clean_rank = parse_rank_data(rank) # the rank is a cluttered object so we clean it to only get what we need
    
    # create the summoner format
    full_summoner = {
        "puuid": puuid,
        "gameName": account['gameName'],
        "tagLine": account['tagLine'],
        "rankTier": clean_rank['rankTier'],
        "rankDivision": clean_rank['rankDivision'],
        "lp": clean_rank['lp'],
        "wins": clean_rank['wins'],
        "losses": clean_rank['losses']

    }
    save_summoner(full_summoner) #add to db
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
    
    # get email and password
    email = data['email']
    password = data['password']
    
    # call validate_email to check validity of the email and also get the domain for university lookup
    is_valid, extracted_domain = validate_email(email)
    
    if not is_valid:
        return jsonify({"error": "Not valid email"}), 400 
    uni_id = get_university_id(extracted_domain) #get the uni id by looking up domain in db
    if not uni_id:
        return jsonify({"error": "Not valid university id"}), 400 # if no uni id is found, return (bad request)``
    hashed_pass = hash_password(password) 
    user = create_user(email, hashed_pass, uni_id)
    if not user:
        return jsonify({"error": "Not valid User"}), 400 # if user creation fails for some reason, return (bad request)
    return jsonify({"message": "User created!"}), 201 # if everything goes well, return success message with 201 (created) status code

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
    
    Args (Json):
    email (str): The user's email
    password (str): The user's password

    Returns:
        Response: JSON response containing the token and university ID
    """ 
    # get email and password from request body
    data = request.get_json()
    email, password = data['email'], data['password']
    
    # check if email corresponds to a user and get the stored hash and uni_id for that user
    result = get_user_by_email(email)
    if not result:
        return jsonify({"error": "User Not Found!"}), 401 # if no user is found with that email, return unauthorized
    user_id, stored_hash, uni_id = result # if user is found, unpack the stored hash and uni_id for that user
    if not check_password(password, stored_hash): 
        return jsonify({"error": "Incorrect Password!"}), 401 # if given pass and the hashed pass don't match, return unauthorized
    
    token = jwt.encode({
        'user_id': user_id,
        'exp': data.datetime.now(datetime.utcnow() + datetime.timedelta(hours=24)) # token expires in 24 hours
    }, app.config['SECRET_KEY'], algorithm="HS256") # create the token using the user_id and the secret key
    return jsonify({"token": token, "uni_id": uni_id}) # if all checks, return token for auth and uni_if for frontend use

@app.route('/api/claim_summoner', methods=['POST'])
@token_required
def claim_summoner(current_user_id):
    data = request.get_json()
    puuid = data['puuid'] # We no longer ask for user_id here!
    
    claim_summoner_(current_user_id, puuid)
    return jsonify({'message': "Profile claimed!"})

@app.route('/api/refresh_summoner', methods=['POST'])
@token_required
def refresh_summoner(current_user_id):
    puuid = get_summoner_by_user(current_user_id)
    rank = get_rank_data(puuid)
    clean_rank = parse_rank_data(rank)
    
    update_summoner_rank(
        puuid, 
        clean_rank['rankTier'], 
        clean_rank['rankDivision'], 
        clean_rank['lp'],
        clean_rank['wins'],
        clean_rank['losses']
    )
    return jsonify({'message': "Summoner Updated!"})

@app.route('/api/profile/me', methods=['GET'])
@token_required
def get_user_profile(current_user_id):
    profile = get_profile_by_user(current_user_id)
    
    if not profile:
        return jsonify({"error": "Profile not found"}), 404
        
    return jsonify({
        "gameName": profile['game_name'],
        "tagLine": profile['tag'],
        "rankTier": profile['rank_tier'],
        "rankDivision": profile['rank_division'],
        "lp": profile['lp'],
        "wins": profile.get('wins', 0),
        "losses": profile.get('losses', 0)
    })
    
    
if __name__ == '__main__':
    app.run(debug=True)