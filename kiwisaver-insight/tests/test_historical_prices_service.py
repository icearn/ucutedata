from datetime import date

from kiwisaver_insight.services import historical_prices_service


def test_current_price_changes_for_provider_uses_anz_live_rows(monkeypatch):
    inserted = []
    monkeypatch.setattr(
        historical_prices_service.ANZ_CRAWLER,
        "fetch_prices",
        lambda: [
            {"scheme": "Cash Fund", "unit_price": 1.01, "date": date(2026, 3, 27)},
            {"scheme": "Growth Fund", "unit_price": 2.2, "date": date(2026, 3, 27)},
            {"scheme": "Cash Fund", "unit_price": 1.02, "date": date(2026, 3, 28)},
            {"scheme": "Growth Fund", "unit_price": 2.25, "date": date(2026, 3, 28)},
        ],
    )
    monkeypatch.setattr(
        historical_prices_service,
        "insert_unit_prices",
        lambda provider, rows: inserted.append((provider, list(rows))),
    )

    result = historical_prices_service.current_price_changes_for_provider(
        provider="ANZ",
        lookback_days=14,
        store=True,
        end=date(2026, 3, 28),
    )

    assert result["provider"] == "ANZ"
    assert result["latest_price_date"] == "2026-03-28"
    assert result["previous_price_date"] == "2026-03-27"
    assert result["source"] == "live"
    assert inserted[0][0] == "ANZ"
    assert [fund["scheme"] for fund in result["funds"]] == ["Cash Fund", "Growth Fund"]


def test_trend_series_for_provider_reads_stored_rows(monkeypatch):
    monkeypatch.setattr(
        historical_prices_service,
        "ensure_history_for_provider",
        lambda provider, start, end, schemes=None: None,
    )
    monkeypatch.setattr(
        historical_prices_service,
        "fetch_prices",
        lambda provider, scheme=None, start_date=None, end_date=None: [
            {"scheme": scheme, "unit_price": 1.01, "date": date(2026, 3, 27)},
            {"scheme": scheme, "unit_price": 1.02, "date": date(2026, 3, 28)},
        ],
    )

    series = historical_prices_service.trend_series_for_provider(
        provider="ANZ",
        start=date(2026, 3, 27),
        end=date(2026, 3, 28),
        schemes=["Cash Fund"],
    )

    assert len(series) == 1
    assert series[0].scheme == "Cash Fund"
    assert series[0].points == [
        {"date": "2026-03-27", "unit_price": 1.01},
        {"date": "2026-03-28", "unit_price": 1.02},
    ]
