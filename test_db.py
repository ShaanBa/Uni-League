import psycopg2

#first connect to the database 
con = psycopg2.connect(
    host = "localhost",
    database = "unileague",
    user = "shaanbawa",
    port = "5432",
    password = ""
)


def save_summoner(data: dict):
    con = psycopg2.connect(
        host = "localhost",
        database = "unileague",
        user = "shaanbawa",
        port = "5432",
        password = ""
    )
    cur = con.cursor()
    query = ("""
        INSERT INTO summoners (puuid, game_name, tag, rank_tier, rank_division)
        VALUES (%s, %s, %s, %s, %s) 
        ON CONFLICT (puuid) 
        DO UPDATE SET
            game_name = EXCLUDED.game_name,
            tag = EXCLUDED.tag,
            rank_tier = EXCLUDED.rank_tier,
            rank_division = EXCLUDED.rank_division
        """)
    value = (data['puuid'], data['gameName'], data['tagLine'], data['rankTier'], data['rankDivision'])
    cur.execute(query, value)
    con.commit()