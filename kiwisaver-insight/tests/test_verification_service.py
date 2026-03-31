from datetime import date

from kiwisaver_insight.services import verification_service


def test_verify_live_sources_against_db_summarises_provider_statuses(monkeypatch):
    monkeypatch.setattr(
        verification_service,
        "current_price_changes",
        lambda lookback_days, store: {
            "latest_price_date": "2026-03-31",
            "funds": [
                {
                    "scheme": "Aggressive Fund",
                    "current_unit_price": 1.2345,
                }
            ],
        },
    )

    class StubANZCrawler:
        def fetch_prices(self):
            return [
                {
                    "scheme": "High Growth Fund",
                    "unit_price": 2.3456,
                    "date": date(2026, 3, 30),
                }
            ]

    class StubWestpacCrawler:
        def fetch_prices(self):
            return [
                {
                    "scheme": "High Growth Fund",
                    "unit_price": 3.4567,
                    "date": date(2026, 3, 29),
                }
            ]

    stored_rows = {
        ("ASB", "Aggressive Fund"): {
            "scheme": "Aggressive Fund",
            "unit_price": 1.2345,
            "date": date(2026, 3, 31),
        },
        ("ANZ", "High Growth Fund"): {
            "scheme": "High Growth Fund",
            "unit_price": 2.3,
            "date": date(2026, 3, 28),
        },
        ("Westpac", "High Growth Fund"): None,
    }

    monkeypatch.setattr(verification_service, "ANZCrawler", lambda: StubANZCrawler())
    monkeypatch.setattr(verification_service, "WestpacCrawler", lambda: StubWestpacCrawler())
    monkeypatch.setattr(
        verification_service,
        "fetch_latest_price",
        lambda provider, scheme: stored_rows[(provider, scheme)],
    )

    result = verification_service.verify_live_sources_against_db()
    checks = {(item["provider"], item["scheme"]): item for item in result["checks"]}

    assert result["summary"] == {
        "total": 3,
        "match": 1,
        "stale_db": 1,
        "price_mismatch": 0,
        "missing_in_db": 1,
        "future_db": 0,
    }
    assert checks[("ASB", "Aggressive Fund")]["status"] == "MATCH"
    assert checks[("ANZ", "High Growth Fund")]["status"] == "STALE_DB"
    assert checks[("Westpac", "High Growth Fund")]["status"] == "MISSING_IN_DB"


def test_build_check_detects_price_mismatch(monkeypatch):
    monkeypatch.setattr(
        verification_service,
        "fetch_latest_price",
        lambda provider, scheme: {
            "scheme": scheme,
            "unit_price": 1.5,
            "date": date(2026, 3, 31),
        },
    )

    check = verification_service._build_check(
        provider="ASB",
        scheme="Aggressive Fund",
        display_name="ASB KiwiSaver Aggressive Fund",
        source_price_date="2026-03-31",
        source_unit_price=1.6,
    )

    assert check["status"] == "PRICE_MISMATCH"
    assert check["unit_price_delta"] == 0.1
