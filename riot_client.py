# import requests for https stuff like get post, os for (idk), and dotenv to securely access api
import requests
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("RIOT_API_KEY")

payload = {'game_name': 'PoggyWoggyDoggy6', 'tag_line': 'NA1'}
r = requests.get(f"https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{payload["game_name"]}/{payload['tag_line']}", headers={"X-Riot-Token": api_key})

print(r.content)
