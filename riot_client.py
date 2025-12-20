# import requests for https stuff like get post, os for get api key, and dotenv to securely access api
import requests
import os
from dotenv import load_dotenv

load_dotenv()



def get_riot_account(game_name, tag_line):
    api_key = os.getenv("RIOT_API_KEY")
    r = requests.get(f"https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}", headers={"X-Riot-Token": api_key})
    return r.json()


def get_rank_data(puuid):
    api_key = os.getenv("RIOT_API_KEY")
    r = requests.get(f"https://na1.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}", headers={"X-Riot-Token": api_key})
    return r.json()

def main():
    account = get_riot_account('PoggyWoggyDoggy6', 'NA1')
    puuid = account['puuid']
    print(get_rank_data(puuid))

if __name__ == "__main__":
    main()

