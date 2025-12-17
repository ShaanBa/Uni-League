# import requests for https stuff like get post, os for get api key, and dotenv to securely access api
import requests
import os
from dotenv import load_dotenv

load_dotenv()



def get_riot_account(game_name, tag_line):
    api_key = os.getenv("RIOT_API_KEY")
    r = requests.get(f"https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}", headers={"X-Riot-Token": api_key})
    return r.json()
