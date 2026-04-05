from fastapi.testclient import TestClient
from kiwisaver_insight.api import app
from kiwisaver_insight.services.analysis_service import AnalysisDataUnavailableError

client = TestClient(app)

def test_current_scheme_analysis(monkeypatch):
    monkeypatch.setattr(
        "kiwisaver_insight.api.build_current_scheme_analysis",
        lambda scheme_ids, years, initial_funds, monthly_contribution: {
            "results": [
                {
                    "scheme": {"id": "1", "name": "ANZ KiwiSaver Conservative Fund"},
                    "history": [
                        {"date": "2026-01-31", "timestamp": 1738252800000, "price": 1.0234},
                        {"date": "2026-02-28", "timestamp": 1740700800000, "price": 1.0312},
                    ],
                    "history_window": {
                        "requested_start": "2021-04-04",
                        "requested_end": "2026-04-03",
                        "available_start": "2026-01-31",
                        "available_end": "2026-02-28",
                        "point_count": 2,
                        "granularity": "monthly_real_prices",
                    },
                    "outcome": {"final_value": 10250, "total_return": 250},
                }
                for _ in scheme_ids
            ]
        },
    )

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
    assert "history_window" in result
    assert "outcome" in result
    assert len(result["history"]) > 0
    assert result["outcome"]["final_value"] > 10000


def test_scenario_comparison(monkeypatch):
    monkeypatch.setattr(
        "kiwisaver_insight.api.build_scenario_comparison",
        lambda selected_scheme, initial_funds, monthly_contribution, years: {
            "requested_years": years,
            "selected_scheme": {"id": "1", "name": selected_scheme},
            "scenario_backtest_window": {"calibration_years": years, "max_actual_years_used": 8.5},
            "scenarios": [
                {
                    "id": "same",
                    "label": "Stay with Same Scheme",
                    "description": "Projection calibrated from the currently selected KiwiSaver scheme.",
                    "color": "#3b82f6",
                    "source_scheme": {"id": "1", "name": selected_scheme},
                    "backtest": {"final_balance": 118000, "total_return": 28000, "source_months": 96},
                    "model": {"annualized_return": 0.071, "annualized_volatility": 0.084},
                    "projection": [
                        {"year": 0, "balance": 10000, "invested": 10000, "returns": 0},
                        {"year": years, "balance": 118000, "invested": 70000, "returns": 48000},
                    ],
                    "final_value": 118000,
                    "total_return": 48000,
                    "total_invested": 70000,
                }
            ],
            "best_scenario_id": "same",
            "future_projections": [
                {"years_ahead": 5, "total_years": years + 5, "projected_value": 165000, "projected_gain": 47000}
            ],
        },
    )

    response = client.post(
        "/api/scenarios/compare",
        json={
            "selected_scheme": "ANZ KiwiSaver Conservative Fund",
            "initial_funds": 10000,
            "monthly_contribution": 500,
            "years": 10,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["selected_scheme"]["name"] == "ANZ KiwiSaver Conservative Fund"
    assert data["scenarios"][0]["final_value"] == 118000
    assert data["future_projections"][0]["projected_value"] == 165000


def test_strategy_backtest(monkeypatch):
    monkeypatch.setattr(
        "kiwisaver_insight.api.simulate_strategy",
        lambda conditions, initial_funds, monthly_contribution, years, selected_scheme: {
            "data": [
                {
                    "date": "2025-01-31",
                    "month": 0,
                    "balance": 10000,
                    "invested": 10000,
                    "returns": 0,
                    "scheme": "balanced",
                    "provider_scheme": selected_scheme or "ASB Balanced Fund",
                    "phase": "backtest",
                },
                {
                    "date": "2025-02-28",
                    "month": 1,
                    "balance": 10600,
                    "invested": 10500,
                    "returns": 100,
                    "scheme": "balanced",
                    "provider_scheme": selected_scheme or "ASB Balanced Fund",
                    "phase": "backtest",
                },
            ],
            "switches": [],
            "final_balance": 10600,
            "total_invested": 10500,
            "actual_window": {
                "provider": "ASB",
                "start_date": "2025-01-31",
                "end_date": "2025-02-28",
                "point_count": 2,
                "source_months": 1,
            },
            "model": {"annualized_return": 0.062},
            "future_projections": [],
            "start_scheme": {"name": selected_scheme or "ASB Balanced Fund"},
        },
    )

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
        "years": 10,
        "selected_scheme": "ASB Balanced Fund",
    })
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "switches" in data
    assert "final_balance" in data
    assert len(data["data"]) > 0
    assert data["start_scheme"]["name"] == "ASB Balanced Fund"


def test_strategy_recommendation(monkeypatch):
    monkeypatch.setattr(
        "kiwisaver_insight.api.build_strategy_recommendation",
        lambda selected_scheme, initial_funds, monthly_contribution, years, user_id, risk_preference, objective, persist: {
            "generated_at": "2026-04-05T00:00:00Z",
            "user_id": user_id,
            "selected_scheme": {"id": "6", "name": selected_scheme, "provider": "ASB"},
            "risk_preference": risk_preference or "balanced",
            "objective": objective or "balance_growth_risk",
            "recommended_strategy": {
                "id": "drawdown_guard",
                "label": "Drawdown Guard",
                "score": 82.4,
                "backtest": {
                    "final_balance": 135000,
                    "annualized_return": 0.072,
                    "max_drawdown_pct": 8.2,
                    "switch_count": 4,
                    "source_months": 96,
                },
            },
            "top_strategies": [
                {"id": "drawdown_guard", "label": "Drawdown Guard", "score": 82.4},
                {"id": "stay_put", "label": "Stay Put", "score": 79.1},
            ],
            "review_cycle": "Recalculate monthly",
            "disclaimer": "Backtest-based only",
            "recommendation_record": {"id": 12, "created_at": "2026-04-05T00:00:00Z"},
        },
    )

    response = client.post(
        "/api/strategy/recommendation",
        json={
            "selected_scheme": "ASB KiwiSaver Moderate Fund",
            "initial_funds": 10000,
            "monthly_contribution": 500,
            "years": 10,
            "user_id": "local-user",
            "risk_preference": "balanced",
            "objective": "balance_growth_risk",
            "persist": True,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["recommended_strategy"]["id"] == "drawdown_guard"
    assert data["recommendation_record"]["id"] == 12


def test_latest_strategy_recommendation(monkeypatch):
    monkeypatch.setattr(
        "kiwisaver_insight.api.get_latest_strategy_recommendation",
        lambda user_id, selected_scheme=None: {
            "selected_scheme": {"name": selected_scheme or "ASB KiwiSaver Moderate Fund"},
            "recommended_strategy": {"id": "stay_put", "label": "Stay Put"},
            "recommendation_record": {"id": 7},
        },
    )

    response = client.get(
        "/api/strategy/recommendation/latest",
        params={"user_id": "local-user", "selected_scheme": "ASB KiwiSaver Moderate Fund"},
    )
    assert response.status_code == 200
    assert response.json()["recommendation_record"]["id"] == 7

def test_current_scheme_analysis_invalid_scheme(monkeypatch):
    monkeypatch.setattr(
        "kiwisaver_insight.api.build_current_scheme_analysis",
        lambda scheme_ids, years, initial_funds, monthly_contribution: {"results": []},
    )

    response = client.post("/api/analysis/current-scheme", json={
        "scheme_ids": ["invalid_id"],
        "years": 5,
        "initial_funds": 10000,
        "monthly_contribution": 500
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 0


def test_current_scheme_analysis_returns_502_when_data_unavailable(monkeypatch):
    monkeypatch.setattr(
        "kiwisaver_insight.api.build_current_scheme_analysis",
        lambda scheme_ids, years, initial_funds, monthly_contribution: (_ for _ in ()).throw(
            AnalysisDataUnavailableError("ANZ source unavailable")
        ),
    )

    response = client.post(
        "/api/analysis/current-scheme",
        json={
            "scheme_ids": ["1"],
            "years": 5,
            "initial_funds": 10000,
            "monthly_contribution": 500,
        },
    )

    assert response.status_code == 502
    assert "ANZ source unavailable" in response.json()["detail"]


def test_strategy_backtest_returns_502_when_data_unavailable(monkeypatch):
    monkeypatch.setattr(
        "kiwisaver_insight.api.simulate_strategy",
        lambda conditions, initial_funds, monthly_contribution, years, selected_scheme: (_ for _ in ()).throw(
            AnalysisDataUnavailableError("Strategy history unavailable")
        ),
    )

    response = client.post(
        "/api/strategy/backtest",
        json={
            "conditions": [],
            "initial_funds": 10000,
            "monthly_contribution": 500,
            "years": 10,
            "selected_scheme": "ASB Balanced Fund",
        },
    )

    assert response.status_code == 502
    assert "Strategy history unavailable" in response.json()["detail"]


def test_strategy_backtest_time_based(monkeypatch):
    monkeypatch.setattr(
        "kiwisaver_insight.api.simulate_strategy",
        lambda conditions, initial_funds, monthly_contribution, years, selected_scheme: {
            "data": [
                {
                    "date": "2024-01-31",
                    "month": 0,
                    "balance": 10000,
                    "invested": 10000,
                    "returns": 0,
                    "scheme": "balanced",
                },
                {
                    "date": "2026-01-31",
                    "month": 24,
                    "balance": 23000,
                    "invested": 22000,
                    "returns": 1000,
                    "scheme": "growth",
                },
            ],
            "switches": [
                {"month": 24, "from": "balanced", "to": "growth", "reason": "Time Switch"}
            ],
            "final_balance": 23000,
            "total_invested": 22000,
        },
    )

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
