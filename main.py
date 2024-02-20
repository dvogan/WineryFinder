from flask import Flask, render_template, send_from_directory, jsonify, request
import requests

import os

import json

#print(os.environ)

googleApiKey = os.environ.get('GOOGLE_API_KEY')
print(f"Google API key: {googleApiKey}")

import psycopg2

#need to remove this!
print(os.environ.get('WINE_DATABASE_URL'))
conn=psycopg2.connect(os.environ.get('WINE_DATABASE_URL'))

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

@app.route('/get-place-details', methods=['GET'])
def get_place_details():
    place_id = request.args.get('place_id')
    api_key = googleApiKey

    sql = f"select details from wineries where placeid='{place_id}'"
    print(sql)
    global conn
    if conn.closed:
        conn=psycopg2.connect(os.environ.get('WINE_DATABASE_URL'))

    cursor = conn.cursor()
    cursor.execute(sql)

    row = cursor.fetchone()

    #print(row)

    if row is not None:
        print("RETRIEVE PLACE DETAILS FROM DATABASE!!")

        details=row[0]

        #print(details)

        return jsonify(details=details)
    else:
        print("RETRIEVE PLACE DETAILS FROM GOOGLE!!")

        url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=website,formatted_phone_number,opening_hours&key={api_key}"
        response = requests.get(url)
        data = response.json()

        if data['status'] == 'OK':
            try:
                #print(data['result'])

                #website=data['result']['website']

                json_string = json.dumps(data['result'])

                print(json_string)

                sql=f"insert into wineries (placeid, details) values (%s,%s)"
                #print(sql)

                values=(place_id,json_string)

                cursor.execute(sql,values)
                conn.commit()

                return jsonify(details=json_string)
            except Exception as e:
                print(f"An error occurred: {e}")

                sql=f"insert into wineries values ('{place_id}','N/A')"
                #print(sql)
                cursor.execute(sql)
                conn.commit()

                return jsonify(website='N/A')
        else:
            return jsonify(error=data['status']), 400
    
@app.route('/saveWinery', methods=['POST'])
def handle_checkbox_state():
    place_id = request.form.get('place_id')
    checkbox_state = request.form.get('checkbox_state')
    user = request.form.get('user')

    # Handle the checkbox state here, e.g., perform actions based on checked or unchecked state
    # You can return a response as needed

    # Example response
    response_data = {'message': f'Checkbox for {place_id} is {checkbox_state}'}

    print(response_data);

    if(checkbox_state=="true"):
        #print("insert")
        sql=f"insert into userwineries (placeid,userid) values ('{place_id}','{user}')"
    else:
        #print("delete")
        sql=f"delete from userwineries where placeid='{place_id}' and userid='{user}'"
        
    print(sql)
    cursor = conn.cursor()
    cursor.execute(sql)
    conn.commit()

    return response_data

@app.route('/getUserWineries', methods=['GET'])
def get_user_wineries():
    user = request.args.get('user')

    # Query your database to retrieve user wineries as a list or array
    user_wineries = []  # Replace with your database query

    sql="SELECT * FROM userwineries WHERE userid = '{0}' ".format(user)
    sql+= " ORDER BY placeid"

    print(sql)
    global conn
    if conn.closed:
        conn=psycopg2.connect(os.environ.get('WINE_DATABASE_URL'))

    cursor = conn.cursor()
    cursor.execute(sql)

    rows = cursor.fetchall()

    # Get the column names from the cursor description
    columns = [column[0] for column in cursor.description]

    # Create a list of dictionaries where each dictionary represents a row
    result = [dict(zip(columns, row)) for row in rows]

    # Convert the result to a JSON array
    json_array = json.dumps(result, indent=2)

    return json_array

if __name__ == '__main__':
    app.run(debug=True)