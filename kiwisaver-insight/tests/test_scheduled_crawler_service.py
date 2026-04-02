from datetime import date, timedelta

from kiwisaver_insight.scheme_catalog import list_tracked_schemes
from kiwisaver_insight.services import scheduled_crawler_service


def test_run_incremental_crawl_resumes_from_latest_db_dates(monkeypatch):
    latest_dates = {
        ("ASB", None): date(2026, 3, 30),
        ("ANZ", "Conservative Fund"): date(2026, 3, 27),
        ("ANZ", "Balanced Growth Fund"): date(2026, 3, 27),
        ("ANZ", "Growth Fund"): date(2026, 3, 27),
        ("ANZ", "High Growth Fund"): date(2026, 3, 27),
        ("Westpac", "Conservative Fund"): date(2026, 3, 29),
        ("Westpac", "Balanced Fund"): date(2026, 3, 29),
        ("Westpac", "Growth Fund"): date(2026, 3, 29),
        ("Westpac", "High Growth Fund"): date(2026, 3, 29),
    }
    inserted_rows = []

    monkeypatch.setattr(
        scheduled_crawler_service,
        "fetch_latest_price_date",
        lambda provider, scheme=None: latest_dates[(provider, scheme)],
    )

    asb_calls = []
    monkeypatch.setattr(
        scheduled_crawler_service,
        "fetch_history",
        lambda start, end, store=False: asb_calls.append((start, end, store)) or [
            {"scheme": "Aggressive Fund", "unit_price": 1.1, "date": "2026-03-31"}
        ],
    )

    class StubANZCrawler:
        def fetch_history(self, scheme, start_date, end_date):
            return [
                {"scheme": scheme, "unit_price": 1.2, "date": start_date},
                {"scheme": scheme, "unit_price": 1.3, "date": end_date},
            ]

    class StubWestpacCrawler:
        def fetch_prices(self):
            return [
                {"scheme": "Conservative Fund", "unit_price": 1.4, "date": date(2026, 3, 29)},
                {"scheme": "Conservative Fund", "unit_price": 1.5, "date": date(2026, 3, 30)},
                {"scheme": "Conservative Fund", "unit_price": 1.6, "date": date(2026, 4, 1)},
                {"scheme": "Balanced Fund", "unit_price": 1.7, "date": date(2026, 3, 29)},
                {"scheme": "Balanced Fund", "unit_price": 1.8, "date": date(2026, 3, 30)},
                {"scheme": "Balanced Fund", "unit_price": 1.9, "date": date(2026, 4, 1)},
                {"scheme": "Growth Fund", "unit_price": 2.0, "date": date(2026, 3, 29)},
                {"scheme": "Growth Fund", "unit_price": 2.1, "date": date(2026, 3, 30)},
                {"scheme": "Growth Fund", "unit_price": 2.2, "date": date(2026, 4, 1)},
                {"scheme": "High Growth Fund", "unit_price": 2.3, "date": date(2026, 3, 29)},
                {"scheme": "High Growth Fund", "unit_price": 2.4, "date": date(2026, 3, 30)},
                {"scheme": "High Growth Fund", "unit_price": 2.5, "date": date(2026, 4, 1)},
            ]

    monkeypatch.setattr(scheduled_crawler_service, "ANZCrawler", lambda: StubANZCrawler())
    monkeypatch.setattr(scheduled_crawler_service, "WestpacCrawler", lambda: StubWestpacCrawler())
    monkeypatch.setattr(
        scheduled_crawler_service,
        "insert_unit_prices",
        lambda provider, rows: inserted_rows.append((provider, list(rows))),
    )

    result = scheduled_crawler_service.run_incremental_crawl(end=date(2026, 4, 1))
    jobs = {(job["provider"], job["scheme"]): job for job in result["jobs"]}

    assert asb_calls == [(date(2026, 3, 31), date(2026, 4, 1), True)]
    assert result["total_fetched_rows"] == 17
    assert jobs[("ASB", "ALL")] == {
        "provider": "ASB",
        "scheme": "ALL",
        "latest_db_date": "2026-03-30",
        "requested_start_date": "2026-03-31",
        "requested_end_date": "2026-04-01",
        "fetched_rows": 1,
        "status": "fetched",
    }

    for scheme in [item.scheme for item in list_tracked_schemes("ANZ")]:
        assert jobs[("ANZ", scheme)] == {
            "provider": "ANZ",
            "scheme": scheme,
            "latest_db_date": "2026-03-27",
            "requested_start_date": "2026-03-28",
            "requested_end_date": "2026-04-01",
            "fetched_rows": 2,
            "status": "fetched",
        }

    for scheme in [item.scheme for item in list_tracked_schemes("Westpac")]:
        assert jobs[("Westpac", scheme)] == {
            "provider": "Westpac",
            "scheme": scheme,
            "latest_db_date": "2026-03-29",
            "requested_start_date": "2026-03-30",
            "requested_end_date": "2026-04-01",
            "fetched_rows": 2,
            "status": "fetched",
        }

    assert inserted_rows[0] == (
        "ANZ",
        [
            {"scheme": "Conservative Fund", "unit_price": 1.2, "date": date(2026, 3, 28)},
            {"scheme": "Conservative Fund", "unit_price": 1.3, "date": date(2026, 4, 1)},
        ],
    )
    assert inserted_rows[-1] == (
        "Westpac",
        [
            {"scheme": "High Growth Fund", "unit_price": 2.4, "date": date(2026, 3, 30)},
            {"scheme": "High Growth Fund", "unit_price": 2.5, "date": date(2026, 4, 1)},
        ],
    )


def test_resolve_start_date_uses_default_window_when_db_is_empty(monkeypatch):
    monkeypatch.setattr(scheduled_crawler_service.settings, "asb_history_default_days", 30)

    end_date = date(2026, 4, 1)
    start_date = scheduled_crawler_service._resolve_start_date(None, end_date)

    assert start_date == end_date - timedelta(days=30)


def test_run_incremental_crawl_keeps_running_when_one_provider_errors(monkeypatch):
    monkeypatch.setattr(
        scheduled_crawler_service,
        "_crawl_asb",
        lambda end_date: {
            "provider": "ASB",
            "scheme": "ALL",
            "latest_db_date": "2026-03-30",
            "requested_start_date": "2026-03-31",
            "requested_end_date": "2026-04-01",
            "fetched_rows": 1,
            "status": "fetched",
        },
    )

    class StubANZCrawler:
        def fetch_history(self, scheme, start_date, end_date):
            if scheme == "High Growth Fund":
                raise ValueError("ANZ data unavailable")
            return [{"scheme": scheme, "unit_price": 1.1, "date": end_date}]

    class StubWestpacCrawler:
        def fetch_prices(self):
            return [
                {"scheme": "Conservative Fund", "unit_price": 2.1, "date": date(2026, 4, 1)},
                {"scheme": "Balanced Fund", "unit_price": 2.2, "date": date(2026, 4, 1)},
                {"scheme": "Growth Fund", "unit_price": 2.3, "date": date(2026, 4, 1)},
                {"scheme": "High Growth Fund", "unit_price": 2.4, "date": date(2026, 4, 1)},
            ]

    monkeypatch.setattr(scheduled_crawler_service, "ANZCrawler", lambda: StubANZCrawler())
    monkeypatch.setattr(scheduled_crawler_service, "WestpacCrawler", lambda: StubWestpacCrawler())
    monkeypatch.setattr(
        scheduled_crawler_service,
        "fetch_latest_price_date",
        lambda provider, scheme=None: date(2026, 3, 30),
    )
    monkeypatch.setattr(scheduled_crawler_service, "insert_unit_prices", lambda provider, rows: None)

    result = scheduled_crawler_service.run_incremental_crawl(end=date(2026, 4, 1))
    jobs = {(job["provider"], job["scheme"]): job for job in result["jobs"]}

    assert result["total_fetched_rows"] == 8
    assert jobs[("ANZ", "High Growth Fund")] == {
        "provider": "ANZ",
        "scheme": "High Growth Fund",
        "latest_db_date": None,
        "requested_start_date": None,
        "requested_end_date": None,
        "fetched_rows": 0,
        "status": "error",
        "error": "ANZ data unavailable",
    }
    assert jobs[("Westpac", "Growth Fund")]["status"] == "fetched"


def test_run_incremental_crawl_includes_alert_evaluation(monkeypatch):
    monkeypatch.setattr(
        scheduled_crawler_service,
        "_crawl_asb",
        lambda end_date: {
            "provider": "ASB",
            "scheme": "ALL",
            "latest_db_date": "2026-03-30",
            "requested_start_date": "2026-03-31",
            "requested_end_date": "2026-04-01",
            "fetched_rows": 1,
            "status": "fetched",
        },
    )
    monkeypatch.setattr(scheduled_crawler_service, "_crawl_anz_jobs", lambda end_date: [])
    monkeypatch.setattr(scheduled_crawler_service, "_crawl_westpac_jobs", lambda end_date: [])
    monkeypatch.setattr(
        scheduled_crawler_service,
        "evaluate_active_alerts",
        lambda: {
            "checked_rules": 2,
            "matched_rules": 1,
            "triggered_events_count": 1,
            "triggered_events": [{"id": 1}],
            "errors": [],
        },
    )

    result = scheduled_crawler_service.run_incremental_crawl(end=date(2026, 4, 1))

    assert result["alerts"] == {
        "checked_rules": 2,
        "matched_rules": 1,
        "triggered_events_count": 1,
        "triggered_events": [{"id": 1}],
        "errors": [],
    }
