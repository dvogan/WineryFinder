from flask import Flask, render_template, send_from_directory, jsonify, request
import requests

import os

#print(os.environ)

googleApiKey = os.environ.get('GOOGLE_API_KEY')
print(f"Google API key: {googleApiKey}")

import psycopg2

#need to remove this!
conn=psycopg2.connect("postgresql://postgres:6C2GGF6F5aAE5eeEeb1dc12Aaad2gbDB@viaduct.proxy.rlwy.net:14941/railway")
cursor = conn.cursor()

testUser="1"

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/proxy-google-maps', methods=['GET'])
def proxy_google_maps():
    api_key = googleApiKey  # Replace with your actual API key
    url = f'https://maps.googleapis.com/maps/api/js?key={api_key}&{request.query_string.decode()}'
    response = requests.get(url)
    return response.content, response.status_code

@app.route('/get-place-website', methods=['GET'])
def get_place_website():
    place_id = request.args.get('place_id')
    api_key = googleApiKey  # Keep your API Key here

    url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=website&key={api_key}"
    response = requests.get(url)
    data = response.json()

    if data['status'] == 'OK':
        try:
            website=data['result']['website']
            return jsonify(website=website)
        except:
            return jsonify(website='N/A')
    else:
        return jsonify(error=data['status']), 400
    
@app.route('/saveWinery', methods=['POST'])
def handle_checkbox_state():
    place_id = request.form.get('place_id')
    checkbox_state = request.form.get('checkbox_state')

    # Handle the checkbox state here, e.g., perform actions based on checked or unchecked state
    # You can return a response as needed

    # Example response
    response_data = {'message': f'Checkbox for {place_id} is {checkbox_state}'}

    print(response_data);

    if(checkbox_state=="true"):
        print("insert")
        sql=f"insert into userwineries (placeid,userid) values ('{place_id}','{testUser}')"
    else:
        print("delete")
        sql=f"delete from userwineries where placeid='{place_id}' and userid='{testUser}'"
        
    print(sql)
    cursor.execute(sql)
    conn.commit()

@app.route('/getUserWineries', methods=['GET'])
def get_user_wineries():
    # Query your database to retrieve user wineries as a list or array
    user_wineries = []  # Replace with your database query

    sql="SELECT * FROM userwineries WHERE userid = '{0}' ".format(testUser)
    sql+= " ORDER BY placeid"

    print(sql)

    cursor.execute(sql)

    # Loop through the cursor results and build the list of dictionaries
    for row in cursor:
        #print(row)
        user_wineries.append(row[1])

    print(user_wineries)

    # Return the wineries as JSON response
    return jsonify(wineries=user_wineries)
    return jsonify(response_data)

if __name__ == '__main__':
    app.run(debug=True)