from datetime import date, timedelta

from kiwisaver_insight.services import scheduled_crawler_service


def test_run_incremental_crawl_resumes_from_latest_db_dates(monkeypatch):
    latest_dates = {
        ("ASB", None): date(2026, 3, 30),
        ("ANZ", "High Growth Fund"): date(2026, 3, 27),
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
            assert scheme == "High Growth Fund"
            return [
                {"scheme": scheme, "unit_price": 1.2, "date": start_date},
                {"scheme": scheme, "unit_price": 1.3, "date": end_date},
            ]

    class StubWestpacCrawler:
        def fetch_prices(self):
            return [
                {"scheme": "High Growth Fund", "unit_price": 1.4, "date": date(2026, 3, 29)},
                {"scheme": "High Growth Fund", "unit_price": 1.5, "date": date(2026, 3, 30)},
                {"scheme": "High Growth Fund", "unit_price": 1.6, "date": date(2026, 4, 1)},
            ]

    monkeypatch.setattr(scheduled_crawler_service, "ANZCrawler", lambda: StubANZCrawler())
    monkeypatch.setattr(scheduled_crawler_service, "WestpacCrawler", lambda: StubWestpacCrawler())
    monkeypatch.setattr(
        scheduled_crawler_service,
        "insert_unit_prices",
        lambda provider, rows: inserted_rows.append((provider, list(rows))),
    )

    result = scheduled_crawler_service.run_incremental_crawl(end=date(2026, 4, 1))

    assert asb_calls == [(date(2026, 3, 31), date(2026, 4, 1), True)]
    assert result["total_fetched_rows"] == 5
    assert result["jobs"] == [
        {
            "provider": "ASB",
            "scheme": "ALL",
            "latest_db_date": "2026-03-30",
            "requested_start_date": "2026-03-31",
            "requested_end_date": "2026-04-01",
            "fetched_rows": 1,
            "status": "fetched",
        },
        {
            "provider": "ANZ",
            "scheme": "High Growth Fund",
            "latest_db_date": "2026-03-27",
            "requested_start_date": "2026-03-28",
            "requested_end_date": "2026-04-01",
            "fetched_rows": 2,
            "status": "fetched",
        },
        {
            "provider": "Westpac",
            "scheme": "High Growth Fund",
            "latest_db_date": "2026-03-29",
            "requested_start_date": "2026-03-30",
            "requested_end_date": "2026-04-01",
            "fetched_rows": 2,
            "status": "fetched",
        },
    ]
    assert inserted_rows == [
        (
            "ANZ",
            [
                {"scheme": "High Growth Fund", "unit_price": 1.2, "date": date(2026, 3, 28)},
                {"scheme": "High Growth Fund", "unit_price": 1.3, "date": date(2026, 4, 1)},
            ],
        ),
        (
            "Westpac",
            [
                {"scheme": "High Growth Fund", "unit_price": 1.5, "date": date(2026, 3, 30)},
                {"scheme": "High Growth Fund", "unit_price": 1.6, "date": date(2026, 4, 1)},
            ],
        ),
    ]


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
    monkeypatch.setattr(
        scheduled_crawler_service,
        "_crawl_anz_high_growth",
        lambda end_date: (_ for _ in ()).throw(ValueError("ANZ data unavailable")),
    )
    monkeypatch.setattr(
        scheduled_crawler_service,
        "_crawl_westpac_high_growth",
        lambda end_date: {
            "provider": "Westpac",
            "scheme": "High Growth Fund",
            "latest_db_date": "2026-03-30",
            "requested_start_date": "2026-03-31",
            "requested_end_date": "2026-04-01",
            "fetched_rows": 2,
            "status": "fetched",
        },
    )

    result = scheduled_crawler_service.run_incremental_crawl(end=date(2026, 4, 1))

    assert result["total_fetched_rows"] == 3
    assert result["jobs"][1] == {
        "provider": "ANZ",
        "scheme": "High Growth Fund",
        "latest_db_date": None,
        "requested_start_date": None,
        "requested_end_date": None,
        "fetched_rows": 0,
        "status": "error",
        "error": "ANZ data unavailable",
    }
