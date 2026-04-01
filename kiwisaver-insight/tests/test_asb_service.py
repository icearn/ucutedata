from datetime import date

from kiwisaver_insight.services import asb_service


def test_fetch_history_deduplicates_repeated_snapshots(monkeypatch):
    snapshots = {
        date(2026, 3, 27): [
            {"scheme": "Aggressive Fund", "unit_price": 1.10, "date": date(2026, 3, 27)},
            {"scheme": "Growth Fund", "unit_price": 2.20, "date": date(2026, 3, 27)},
        ],
        date(2026, 3, 28): [
            {"scheme": "Aggressive Fund", "unit_price": 1.10, "date": date(2026, 3, 28)},
            {"scheme": "Growth Fund", "unit_price": 2.20, "date": date(2026, 3, 28)},
        ],
        date(2026, 3, 29): [
            {"scheme": "Aggressive Fund", "unit_price": 1.15, "date": date(2026, 3, 29)},
            {"scheme": "Growth Fund", "unit_price": 2.30, "date": date(2026, 3, 29)},
        ],
    }

    monkeypatch.setattr(asb_service.settings, "asb_history_backoff_seconds", 0)
    monkeypatch.setattr(asb_service.crawler, "fetch_prices", lambda target_date: snapshots[target_date])

    rows = asb_service.fetch_history(date(2026, 3, 27), date(2026, 3, 29))

    assert rows == [
        {"scheme": "Aggressive Fund", "unit_price": 1.10, "date": "2026-03-27"},
        {"scheme": "Growth Fund", "unit_price": 2.20, "date": "2026-03-27"},
        {"scheme": "Aggressive Fund", "unit_price": 1.15, "date": "2026-03-29"},
        {"scheme": "Growth Fund", "unit_price": 2.30, "date": "2026-03-29"},
    ]


def test_current_price_changes_compares_latest_distinct_snapshots(monkeypatch):
    snapshots = {
        date(2026, 3, 27): [
            {"scheme": "Aggressive Fund", "unit_price": 1.3661, "date": date(2026, 3, 27)},
            {"scheme": "Balanced Fund", "unit_price": 3.1364, "date": date(2026, 3, 27)},
        ],
        date(2026, 3, 28): [
            {"scheme": "Aggressive Fund", "unit_price": 1.3661, "date": date(2026, 3, 28)},
            {"scheme": "Balanced Fund", "unit_price": 3.1364, "date": date(2026, 3, 28)},
        ],
        date(2026, 3, 29): [
            {"scheme": "Aggressive Fund", "unit_price": 1.3643, "date": date(2026, 3, 29)},
            {"scheme": "Balanced Fund", "unit_price": 3.1348, "date": date(2026, 3, 29)},
        ],
        date(2026, 3, 30): [
            {"scheme": "Aggressive Fund", "unit_price": 1.3643, "date": date(2026, 3, 30)},
            {"scheme": "Balanced Fund", "unit_price": 3.1348, "date": date(2026, 3, 30)},
        ],
    }

    monkeypatch.setattr(asb_service.settings, "asb_history_backoff_seconds", 0)
    monkeypatch.setattr(asb_service.crawler, "fetch_prices", lambda target_date: snapshots[target_date])
    monkeypatch.setattr(asb_service, "insert_unit_prices", lambda provider, rows: None)

    result = asb_service.current_price_changes(
        lookback_days=4,
        store=True,
        end=date(2026, 3, 30),
    )

    assert result["latest_price_date"] == "2026-03-29"
    assert result["previous_price_date"] == "2026-03-27"
    assert result["funds"] == [
        {
            "scheme": "Aggressive Fund",
            "current_unit_price": 1.3643,
            "previous_unit_price": 1.3661,
            "unit_change": -0.0018,
            "percent_change": -0.1318,
        },
        {
            "scheme": "Balanced Fund",
            "current_unit_price": 3.1348,
            "previous_unit_price": 3.1364,
            "unit_change": -0.0016,
            "percent_change": -0.051,
        },
    ]


def test_ensure_history_backfills_missing_older_window(monkeypatch):
    fetched_ranges = []

    def fake_fetch_prices(provider, scheme=None, start_date=None, end_date=None):
        if not fetched_ranges:
            return [
                {"scheme": "Aggressive Fund", "unit_price": 1.10, "date": date(2026, 3, 1)},
                {"scheme": "Aggressive Fund", "unit_price": 1.12, "date": date(2026, 3, 15)},
                {"scheme": "Aggressive Fund", "unit_price": 1.14, "date": date(2026, 3, 30)},
            ]

        return [
            {"scheme": "Aggressive Fund", "unit_price": 1.0, "date": date(2026, 1, 2)},
            {"scheme": "Aggressive Fund", "unit_price": 1.05, "date": date(2026, 2, 1)},
            {"scheme": "Aggressive Fund", "unit_price": 1.10, "date": date(2026, 3, 1)},
            {"scheme": "Aggressive Fund", "unit_price": 1.12, "date": date(2026, 3, 15)},
            {"scheme": "Aggressive Fund", "unit_price": 1.14, "date": date(2026, 3, 30)},
        ]

    def fake_fetch_history(start, end, store=False):
        fetched_ranges.append((start, end, store))
        return []

    monkeypatch.setattr(asb_service, "fetch_prices", fake_fetch_prices)
    monkeypatch.setattr(asb_service, "fetch_history", fake_fetch_history)

    rows = asb_service.ensure_history(date(2026, 1, 1), date(2026, 3, 30))

    assert fetched_ranges == [(date(2026, 1, 1), date(2026, 2, 28), True)]
    assert rows[0]["date"] == date(2026, 1, 2)
    assert rows[-1]["date"] == date(2026, 3, 30)
