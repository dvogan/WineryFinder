from flask import Flask, render_template, send_from_directory, jsonify, request
import requests


app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')



@app.route('/get-place-website', methods=['GET'])
def get_place_website():
    place_id = request.args.get('place_id')
    api_key = 'AIzaSyAi9JAC2vavwdRimnBvD1sxqCWfSxu8EtY'  # Keep your API Key here

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