# server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
from collections import deque

app = Flask(__name__)
CORS(app)

# Store packages in memory (in production, use a database)
packages = deque(maxlen=1000)

@app.route('/api/packages', methods=['POST'])
def receive_package():
    package = request.json
    packages.append(package)
    return jsonify({'status': 'success'}), 200

@app.route('/api/packages', methods=['GET'])
def get_packages():
    return jsonify(list(packages))

def run_server():
    app.run(host='0.0.0.0', port=5000)

if __name__ == '__main__':
    run_server()