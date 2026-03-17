from fastapi.testclient import TestClient
from kiwisaver_insight.api import app

client = TestClient(app)

def test_current_scheme_analysis():
    response = client.post("/api/analysis/current-scheme", json={
        "scheme_ids": ["1", "2"],
        "years": 5,
        "initial_funds": 10000,
        "monthly_contribution": 500
    })
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 2
    
    result = data["results"][0]
    assert "scheme" in result
    assert "history" in result
    assert "outcome" in result
    assert len(result["history"]) > 0
    assert result["outcome"]["final_value"] > 10000

def test_strategy_backtest():
    response = client.post("/api/strategy/backtest", json={
        "conditions": [
            {
                "id": "1",
                "type": "price_drop",
                "label": "Price Drop",
                "from_scheme": "balanced",
                "to_scheme": "conservative",
                "threshold": 10,
                "threshold_unit": "%"
            }
        ],
        "initial_funds": 10000,
        "monthly_contribution": 500,
        "years": 10
    })
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "switches" in data
    assert "final_balance" in data
    assert len(data["data"]) > 0

def test_current_scheme_analysis_invalid_scheme():
    response = client.post("/api/analysis/current-scheme", json={
        "scheme_ids": ["invalid_id"],
        "years": 5,
        "initial_funds": 10000,
        "monthly_contribution": 500
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 0

def test_strategy_backtest_time_based():
    response = client.post("/api/strategy/backtest", json={
        "conditions": [
            {
                "id": "2",
                "type": "time_based",
                "label": "Time Switch",
                "from_scheme": "balanced",
                "to_scheme": "growth",
                "threshold": 2,
                "threshold_unit": "years"
            }
        ],
        "initial_funds": 10000,
        "monthly_contribution": 500,
        "years": 10
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["switches"]) > 0
    # Should switch every 2 years (approx month 24, 48, etc.)
    assert any(s["month"] == 24 for s in data["switches"])
