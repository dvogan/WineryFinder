from flask import Flask, render_template, request, jsonify
from OpenSSL import SSL

app = Flask(__name__)

import socket
import ssl


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/update_map', methods=['POST'])
def update_map():
    lat = request.form['lat']
    lng = request.form['lng']

    print(lat, lng)

    # Process the new latitude and longitude here
    # You can also store it in a database if needed
    return jsonify({'message': 'Map coordinates updated successfully'})

if __name__ == '__main__':
    # Specify the SSL certificate and key files
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
    ssl_context.load_cert_chain('/Users/daryl/_CODE/server.crt', '/Users/daryl/_CODE/server.key')

    # Run the Flask app with SSL enabled
    app.run(host='0.0.0.0', port=443, ssl_context=ssl_context)
