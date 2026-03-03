from flask import Flask, jsonify, request
from riot_client import get_riot_account, get_rank_data
from db_client import save_summoner, get_university_id, create_user, get_leaderboard, get_user_by_email, claim_summoner_, update_summoner_rank, get_summoner_by_user
from auth_utils import validate_email, hash_password, check_password

app = Flask(__name__)

def parse_rank_data(rank_list):
    for item in rank_list:
        if item["queueType"] == "RANKED_SOLO_5x5":
            return {'rankTier': item['tier'], 'rankDivision': item['rank'], 'lp': item['leaguePoints']}
    return {'rankTier': 'UNRANKED', 'rankDivision': 'N/A', 'lp': 0}

@app.route('/api/search/<game_name>/<tag_line>')
def search_user(game_name, tag_line):
    print(f'Searching for {game_name}')
    account = get_riot_account(game_name, tag_line)
    puuid = account['puuid']
    rank = get_rank_data(puuid)
    clean_rank = parse_rank_data(rank)
    
    full_summoner = {
        "puuid": puuid,
        "gameName": account['gameName'],
        "tagLine": account['tagLine'],
        "rankTier": clean_rank['rankTier'],
        "rankDivision": clean_rank['rankDivision'],
        "lp": clean_rank['lp']
    }
    save_summoner(full_summoner)
    return jsonify(full_summoner)

@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    email = data['email']
    password = data['password']
    is_valid, extracted_domain = validate_email(email)
    if not is_valid:
        return jsonify({"error": "Not valid email"}), 400
    uni_id = get_university_id(extracted_domain)
    if not uni_id:
        return jsonify({"error": "Not valid university id"}), 400
    hashed_pass = hash_password(password)
    user = create_user(email, hashed_pass, uni_id)
    if not user:
        return jsonify({"error": "Not valid User"}), 400
    return jsonify({"message": "User created!"}), 201

@app.route('/api/leaderboard/<uni_id>', methods=['GET'])
def leaderboard(uni_id):
    return jsonify(get_leaderboard(uni_id))

@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    email, password = data['email'], data['password']
    result = get_user_by_email(email)
    if not result:
        return jsonify({"error": "User Not Found!"}), 401
    user_id, stored_hash, uni_id = result
    if not check_password(password, stored_hash):
        return jsonify({"error": "Incorrect Password!"}), 401
    return jsonify({"token": user_id, "uni_id": uni_id})

@app.route('/api/claim_summoner', methods=['POST'])
def claim_summoner():
    data = request.get_json()
    user_id, puuid = data['user_id'], data['puuid']
    claim_summoner_(user_id, puuid)
    return jsonify({'message': "Profile claimed!"})

@app.route('/api/refresh_summoner', methods=['POST'])
def refresh_summoner():
    data = request.get_json()
    user_id = data['user_id']
    puuid = get_summoner_by_user(user_id)
    rank = get_rank_data(puuid)
    clean_rank = parse_rank_data(rank)
    update_summoner_rank(puuid, clean_rank['rankTier'], clean_rank['rankDivision'], clean_rank['lp'])
    return jsonify({'message': "Summoner Updated!"})    
    
    
if __name__ == '__main__':
    app.run(debug=True)