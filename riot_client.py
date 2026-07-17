# import requests for HTTPS requests, os for API key, and dotenv
import requests
import os
import random
from dotenv import load_dotenv

load_dotenv()

def get_regional_routing(platform):
    platform = platform.lower()
    mapping = {
        'na1': 'americas', 'br1': 'americas', 'la1': 'americas', 'la2': 'americas',
        'euw1': 'europe', 'eun1': 'europe', 'tr1': 'europe', 'ru': 'europe',
        'kr': 'asia', 'jp1': 'asia',
        'oc1': 'sea', 'ph2': 'sea', 'sg2': 'sea', 'th2': 'sea', 'tw2': 'sea', 'vn2': 'sea'
    }
    return mapping.get(platform, 'americas')

def get_riot_account(game_name, tag_line, region='na1'):
    api_key = os.getenv("RIOT_API_KEY")
    regional = get_regional_routing(region)
    r = requests.get(f"https://{regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}", headers={"X-Riot-Token": api_key})
    return r.json()

def get_rank_data(puuid, region='na1'):
    api_key = os.getenv("RIOT_API_KEY")
    r = requests.get(f"https://{region.lower()}.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}", headers={"X-Riot-Token": api_key})
    return r.json() 

def get_summoner_metadata(puuid, region='na1'):
    api_key = os.getenv("RIOT_API_KEY")
    r = requests.get(f"https://{region.lower()}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}", headers={"X-Riot-Token": api_key})
    return r.json()

def get_third_party_code(summoner_id, region='na1'):
    api_key = os.getenv("RIOT_API_KEY")
    if not api_key:
        return None
    r = requests.get(f"https://{region.lower()}.api.riotgames.com/lol/platform/v4/third-party-code/by-summoner/{summoner_id}", headers={"X-Riot-Token": api_key})
    if r.status_code == 200:
        return r.text.strip().replace('"', '')
    return None

def get_recent_matches(puuid, region='na1', count=5):
    api_key = os.getenv("RIOT_API_KEY")
    if not api_key:
        # Mock match history generator for developer testing
        champions = ["Aatrox", "Ahri", "Ezreal", "LeeSin", "Yasuo", "Thresh", "Jinx", "Lux", "Zed", "Teemo"]
        mock_matches = []
        for i in range(count):
            win = random.choice([True, False])
            kills = random.randint(1, 15)
            deaths = random.randint(0, 10)
            assists = random.randint(2, 20)
            cs = random.randint(100, 300)
            duration = random.randint(15, 45)
            mock_matches.append({
                'matchId': f"MOCK_MATCH_{i}",
                'championName': random.choice(champions),
                'win': win,
                'kills': kills,
                'deaths': deaths,
                'assists': assists,
                'cs': cs,
                'duration': duration
            })
        return mock_matches

    regional = get_regional_routing(region)
    r = requests.get(f"https://{regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count={count}", headers={"X-Riot-Token": api_key})
    if r.status_code != 200:
        return []
    match_ids = r.json()
    
    match_details = []
    for match_id in match_ids:
        mr = requests.get(f"https://{regional}.api.riotgames.com/lol/match/v5/matches/{match_id}", headers={"X-Riot-Token": api_key})
        if mr.status_code == 200:
            match_data = mr.json()
            participants = match_data.get('info', {}).get('participants', [])
            target_p = next((p for p in participants if p.get('puuid') == puuid), None)
            
            if target_p:
                match_details.append({
                    'matchId': match_id,
                    'championName': target_p.get('championName'),
                    'win': target_p.get('win'),
                    'kills': target_p.get('kills', 0),
                    'deaths': target_p.get('deaths', 0),
                    'assists': target_p.get('assists', 0),
                    'cs': target_p.get('totalMinionsKilled', 0) + target_p.get('neutralMinionsKilled', 0),
                    'duration': match_data.get('info', {}).get('gameDuration', 0) // 60
                })
    return match_details
