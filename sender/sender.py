# sender.py
import csv
import json
import time
import requests
from datetime import datetime

def send_packages(csv_file):
    with open(csv_file, 'r') as file:
        reader = csv.DictReader(file)
        first_row = next(reader)
        start_time = float(first_row['Timestamp'])
        
        # Send first package immediately
        requests.post('http://server:5000/api/packages', json=first_row)
        
        for row in reader:
            current_time = float(row['Timestamp'])
            time_diff = current_time - start_time
            if time_diff > 0:
                time.sleep(time_diff)
            
            # Send package to Flask server
            response = requests.post('http://server:5000/api/packages', json=row)
            if response.status_code != 200:
                print(f"Failed to send package: {row}")
            
            start_time = current_time

if __name__ == '__main__':
    send_packages('traffic_data.csv')