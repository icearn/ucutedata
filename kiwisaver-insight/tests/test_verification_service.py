from datetime import date

from kiwisaver_insight.scheme_catalog import list_tracked_schemes
from kiwisaver_insight.services import verification_service


def test_verify_live_sources_against_db_summarises_provider_statuses(monkeypatch):
    monkeypatch.setattr(
        verification_service,
        "current_price_changes",
        lambda lookback_days, store: {
            "latest_price_date": "2026-03-31",
            "funds": [
                {"scheme": "Conservative Fund", "current_unit_price": 1.1234},
                {"scheme": "Moderate Fund", "current_unit_price": 1.1789},
                {"scheme": "Growth Fund", "current_unit_price": 1.205},
                {"scheme": "Aggressive Fund", "current_unit_price": 1.2345},
            ],
        },
    )

    class StubANZCrawler:
        def fetch_prices(self):
            return [
                {"scheme": "Conservative Fund", "unit_price": 2.101, "date": date(2026, 3, 30)},
                {"scheme": "Balanced Growth Fund", "unit_price": 2.202, "date": date(2026, 3, 30)},
                {"scheme": "Growth Fund", "unit_price": 2.303, "date": date(2026, 3, 30)},
                {"scheme": "High Growth Fund", "unit_price": 2.3456, "date": date(2026, 3, 30)},
            ]

    class StubWestpacCrawler:
        def fetch_prices(self):
            return [
                {"scheme": "Conservative Fund", "unit_price": 3.101, "date": date(2026, 3, 29)},
                {"scheme": "Balanced Fund", "unit_price": 3.202, "date": date(2026, 3, 29)},
                {"scheme": "Growth Fund", "unit_price": 3.303, "date": date(2026, 3, 29)},
                {"scheme": "High Growth Fund", "unit_price": 3.4567, "date": date(2026, 3, 29)},
            ]

    live_rows = {
        ("ASB", "Conservative Fund"): (1.1234, date(2026, 3, 31)),
        ("ASB", "Moderate Fund"): (1.1789, date(2026, 3, 31)),
        ("ASB", "Growth Fund"): (1.205, date(2026, 3, 31)),
        ("ASB", "Aggressive Fund"): (1.2345, date(2026, 3, 31)),
        ("ANZ", "Conservative Fund"): (2.101, date(2026, 3, 30)),
        ("ANZ", "Balanced Growth Fund"): (2.202, date(2026, 3, 30)),
        ("ANZ", "Growth Fund"): (2.303, date(2026, 3, 30)),
        ("ANZ", "High Growth Fund"): (2.3456, date(2026, 3, 30)),
        ("Westpac", "Conservative Fund"): (3.101, date(2026, 3, 29)),
        ("Westpac", "Balanced Fund"): (3.202, date(2026, 3, 29)),
        ("Westpac", "Growth Fund"): (3.303, date(2026, 3, 29)),
        ("Westpac", "High Growth Fund"): (3.4567, date(2026, 3, 29)),
    }
    stored_rows = {
        key: {"scheme": key[1], "unit_price": value[0], "date": value[1]}
        for key, value in live_rows.items()
    }
    stored_rows[("ANZ", "High Growth Fund")] = {
        "scheme": "High Growth Fund",
        "unit_price": 2.3,
        "date": date(2026, 3, 28),
    }
    stored_rows[("Westpac", "High Growth Fund")] = None

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
        "total": len(list_tracked_schemes()),
        "match": len(list_tracked_schemes()) - 2,
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
