from flask import Flask, jsonify
import psycopg2

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

if __name__ == '__main__':
    app.run(debug=True)