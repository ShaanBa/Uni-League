from flask import Flask, jsonify
import psycopg2
from riot_client import get_riot_account, get_rank_data
from test_db import save_summoner

app = Flask(__name__)

@app.route("/")
def return_dict_to_json():
    results = []
    con = psycopg2.connect(
        host = "localhost",
        database = "unileague",
        user = "shaanbawa",
        port = "5432",
        password = ""
    )
    
    cur = con.cursor()

    cur.execute("SELECT * FROM universities")

    rows = cur.fetchall()

    for row in rows:
        results.append({'id': row[0], 'name': row[1], 'domain': row[2], 'logo_link': row[3]})
        
    return jsonify(results)

def parse_rank_data(rank_list):
    for item in rank_list:
        if item["queueType"] == "RANKED_SOLO_5x5":
            return {'rankTier': item['tier'], 'rankDivision': item['rank']}
    return {'rankTier': 'UNRANKED', 'rankDivision': 'N/A'}

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
        "rankDivision": clean_rank['rankDivision']
    }
    save_summoner(full_summoner)
    return jsonify(full_summoner)
if __name__ == '__main__':
    app.run(debug=True)