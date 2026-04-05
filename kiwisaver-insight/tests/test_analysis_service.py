from datetime import date

from kiwisaver_insight.services import analysis_service


def test_to_monthly_history_uses_latest_price_in_each_month():
    rows = [
        {"scheme": "Growth Fund", "unit_price": 1.01, "date": date(2026, 1, 5)},
        {"scheme": "Growth Fund", "unit_price": 1.04, "date": date(2026, 1, 31)},
        {"scheme": "Growth Fund", "unit_price": 1.06, "date": date(2026, 2, 10)},
        {"scheme": "Growth Fund", "unit_price": 1.08, "date": date(2026, 2, 28)},
    ]

    history = analysis_service._to_monthly_history(rows)

    assert [point["date"] for point in history] == ["2026-01-31", "2026-02-28"]
    assert [point["price"] for point in history] == [1.04, 1.08]
    assert all(isinstance(point["timestamp"], int) for point in history)


def test_build_current_scheme_analysis_uses_db_backed_history(monkeypatch):
    monkeypatch.setattr(analysis_service, "_prime_selected_histories", lambda scheme_ids, start_date, end_date: None)
    monkeypatch.setattr(
        analysis_service,
        "fetch_prices",
        lambda provider, scheme=None, start_date=None, end_date=None: [
            {"scheme": "Conservative Fund", "unit_price": 1.0, "date": date(2026, 1, 31)},
            {"scheme": "Conservative Fund", "unit_price": 1.02, "date": date(2026, 2, 28)},
            {"scheme": "Conservative Fund", "unit_price": 1.05, "date": date(2026, 3, 31)},
        ],
    )

    payload = analysis_service.build_current_scheme_analysis(
        scheme_ids=["1"],
        years=1,
        initial_funds=10000,
        monthly_contribution=500,
    )

    assert len(payload["results"]) == 1
    result = payload["results"][0]
    assert result["scheme"]["id"] == "1"
    assert [point["date"] for point in result["history"]] == ["2026-01-31", "2026-02-28", "2026-03-31"]
    assert [point["price"] for point in result["history"]] == [1.0, 1.02, 1.05]
    assert result["history_window"]["granularity"] == "monthly_real_prices"
    assert result["outcome"]["final_value"] > 10000


def test_simulate_strategy_supports_cash_start_scheme(monkeypatch):
    monkeypatch.setattr(analysis_service, "_prime_selected_histories", lambda scheme_ids, start_date, end_date: None)
    monkeypatch.setattr(
        analysis_service,
        "_load_scheme_history",
        lambda scheme_id, start_date, end_date: [
            {"date": "2026-01-31", "price": 1.0},
            {"date": "2026-02-28", "price": 1.001},
            {"date": "2026-03-31", "price": 1.002},
        ],
    )

    result = analysis_service.simulate_strategy(
        conditions=[],
        initial_funds=10000,
        monthly_contribution=250,
        years=1,
        selected_scheme="ANZ KiwiSaver Cash Fund",
    )

    assert result["start_scheme"]["name"] == "ANZ KiwiSaver Cash Fund"
    assert result["start_scheme"]["type"] == "Cash"
    assert result["actual_window"]["provider"] == "ANZ"
    assert len(result["data"]) == 3
