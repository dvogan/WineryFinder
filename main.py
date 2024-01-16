from flask import Flask, render_template, send_from_directory, jsonify, request
import requests

import os

#print(os.environ)

googleApiKey = os.environ.get('GOOGLE_API_KEY')
print(f"Google API key: {googleApiKey}")

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
    
if __name__ == '__main__':
    app.run(debug=True)