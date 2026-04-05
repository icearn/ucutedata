from kiwisaver_insight.services import strategy_recommendation_service as recommendation_service


def test_build_strategy_recommendation_ranks_candidates_and_persists(monkeypatch):
    def fake_simulate_strategy(conditions, initial_funds, monthly_contribution, years, selected_scheme):
        if not conditions:
            key = "stay_put"
        else:
            key = conditions[0].id.split("-")[0]

        metrics = {
            "stay_put": {"annualized_return": 0.04, "vol": 0.03, "final_balance": 120000, "drawdown": 6.0, "switches": []},
            "dg": {"annualized_return": 0.06, "vol": 0.035, "final_balance": 140000, "drawdown": 7.5, "switches": [{"month": 8}]},
            "rl": {"annualized_return": 0.085, "vol": 0.06, "final_balance": 180000, "drawdown": 14.0, "switches": [{"month": 6}, {"month": 15}]},
            "vs": {"annualized_return": 0.05, "vol": 0.025, "final_balance": 130000, "drawdown": 4.5, "switches": [{"month": 5}]},
        }[key]

        return {
            "data": [
                {"date": "2018-01-31", "month": 0, "balance": 10000, "invested": 10000, "returns": 0},
                {"date": "2026-01-31", "month": 96, "balance": metrics["final_balance"], "invested": 70000, "returns": metrics["final_balance"] - 70000},
            ],
            "switches": metrics["switches"],
            "final_balance": metrics["final_balance"],
            "total_invested": 70000,
            "actual_window": {
                "provider": "ASB",
                "start_date": "2018-01-31",
                "end_date": "2026-01-31",
                "point_count": 97,
                "source_months": 96,
            },
            "model": {
                "annualized_return": metrics["annualized_return"],
                "annualized_volatility": metrics["vol"],
            },
            "future_projections": [],
            "start_scheme": {"name": selected_scheme, "provider": "ASB"},
        }

    monkeypatch.setattr(recommendation_service, "simulate_strategy", fake_simulate_strategy)
    monkeypatch.setattr(
        recommendation_service,
        "insert_strategy_recommendation",
        lambda **kwargs: {"id": 99, "created_at": "2026-04-05T00:00:00Z"},
    )

    result = recommendation_service.build_strategy_recommendation(
        selected_scheme="ASB KiwiSaver Moderate Fund",
        initial_funds=10000,
        monthly_contribution=500,
        years=10,
        user_id="local-user",
        risk_preference="balanced",
        objective="maximize_growth",
        persist=True,
    )

    assert result["recommended_strategy"]["id"] == "recovery_ladder"
    assert len(result["top_strategies"]) == 3
    assert result["recommendation_record"]["id"] == 99
    assert result["recommended_strategy"]["comparison_to_baseline"]["final_balance_delta"] > 0
