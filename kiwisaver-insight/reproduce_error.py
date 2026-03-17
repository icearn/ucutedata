import requests
import json

url = "http://localhost:8001/api/strategy/backtest"
payload = {
    "conditions": [
        {
            "id": "1",
            "type": "price_drop",
            # Missing label
            "from_scheme": "aggressive",
            "to_scheme": "conservative",
            "threshold": 10,
            "threshold_unit": "%"
        }
    ],
    "initial_funds": 10000,
    "monthly_contribution": 500,
    "years": 10
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
