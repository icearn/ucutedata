from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, List

from kiwisaver_insight.config import settings
from kiwisaver_insight.crawlers.anz import ANZCrawler
from kiwisaver_insight.crawlers.westpac import WestpacCrawler
from kiwisaver_insight.scheme_catalog import list_tracked_schemes
from kiwisaver_insight.services.alert_monitor_service import evaluate_active_alerts
from kiwisaver_insight.services.asb_service import fetch_history
from kiwisaver_insight.utils.db import fetch_latest_price_date, insert_unit_prices


def run_incremental_crawl(end: date | None = None) -> Dict:
    end_date = end or date.today()
    jobs = [
        _run_job("ASB", "ALL", lambda: _crawl_asb(end_date)),
    ]
    jobs.extend(_crawl_anz_jobs(end_date))
    jobs.extend(_crawl_westpac_jobs(end_date))
    return {
        "run_date": end_date.isoformat(),
        "jobs": jobs,
        "total_fetched_rows": sum(job["fetched_rows"] for job in jobs),
        "alerts": _evaluate_alerts_safely(),
    }


def _crawl_asb(end_date: date) -> Dict:
    latest_date = fetch_latest_price_date("ASB")
    start_date = _resolve_start_date(latest_date, end_date)

    if start_date > end_date:
        return _job_result(
            provider="ASB",
            scheme="ALL",
            latest_db_date=latest_date,
            start_date=start_date,
            end_date=end_date,
            fetched_rows=0,
            status="up_to_date",
        )

    rows = fetch_history(start_date, end_date, store=True)
    return _job_result(
        provider="ASB",
        scheme="ALL",
        latest_db_date=latest_date,
        start_date=start_date,
        end_date=end_date,
        fetched_rows=len(rows),
        status="fetched" if rows else "no_new_rows",
    )


def _crawl_anz_jobs(end_date: date) -> List[Dict]:
    crawler = ANZCrawler()
    return [
        _run_job("ANZ", scheme_def.scheme, lambda scheme=scheme_def.scheme: _crawl_anz_scheme(crawler, scheme, end_date))
        for scheme_def in list_tracked_schemes("ANZ")
    ]


def _crawl_anz_scheme(crawler: ANZCrawler, scheme: str, end_date: date) -> Dict:
    latest_date = fetch_latest_price_date("ANZ", scheme=scheme)
    start_date = _resolve_start_date(latest_date, end_date)

    if start_date > end_date:
        return _job_result(
            provider="ANZ",
            scheme=scheme,
            latest_db_date=latest_date,
            start_date=start_date,
            end_date=end_date,
            fetched_rows=0,
            status="up_to_date",
        )

    rows = crawler.fetch_history(scheme, start_date, end_date)
    if rows:
        insert_unit_prices("ANZ", rows)

    return _job_result(
        provider="ANZ",
        scheme=scheme,
        latest_db_date=latest_date,
        start_date=start_date,
        end_date=end_date,
        fetched_rows=len(rows),
        status="fetched" if rows else "no_new_rows",
    )


def _crawl_westpac_jobs(end_date: date) -> List[Dict]:
    try:
        rows = WestpacCrawler().fetch_prices()
    except Exception as exc:
        return [_error_job("Westpac", scheme.scheme, exc) for scheme in list_tracked_schemes("Westpac")]
    return [
        _run_job(
            "Westpac",
            scheme_def.scheme,
            lambda scheme=scheme_def.scheme: _crawl_westpac_scheme(rows, scheme, end_date),
        )
        for scheme_def in list_tracked_schemes("Westpac")
    ]


def _crawl_westpac_scheme(source_rows: List[Dict], scheme: str, end_date: date) -> Dict:
    latest_date = fetch_latest_price_date("Westpac", scheme=scheme)
    start_date = _resolve_start_date(latest_date, end_date)

    if start_date > end_date:
        return _job_result(
            provider="Westpac",
            scheme=scheme,
            latest_db_date=latest_date,
            start_date=start_date,
            end_date=end_date,
            fetched_rows=0,
            status="up_to_date",
        )

    rows = [
        row
        for row in source_rows
        if row["scheme"] == scheme and start_date <= row["date"] <= end_date
    ]
    if rows:
        insert_unit_prices("Westpac", rows)

    return _job_result(
        provider="Westpac",
        scheme=scheme,
        latest_db_date=latest_date,
        start_date=start_date,
        end_date=end_date,
        fetched_rows=len(rows),
        status="fetched" if rows else "no_new_rows",
    )


def _resolve_start_date(latest_date: date | None, end_date: date) -> date:
    if latest_date is not None:
        return latest_date + timedelta(days=1)
    return end_date - settings.default_history_window


def _run_job(provider: str, scheme: str, fn) -> Dict:
    try:
        return fn()
    except Exception as exc:
        return _error_job(provider, scheme, exc)


def _error_job(provider: str, scheme: str, exc: Exception) -> Dict:
    return {
        "provider": provider,
        "scheme": scheme,
        "latest_db_date": None,
        "requested_start_date": None,
        "requested_end_date": None,
        "fetched_rows": 0,
        "status": "error",
        "error": str(exc),
    }


def _evaluate_alerts_safely() -> Dict:
    try:
        return evaluate_active_alerts()
    except Exception as exc:
        return {
            "checked_rules": 0,
            "matched_rules": 0,
            "triggered_events_count": 0,
            "triggered_events": [],
            "errors": [{"error": str(exc)}],
        }


def _job_result(
    provider: str,
    scheme: str,
    latest_db_date: date | None,
    start_date: date,
    end_date: date,
    fetched_rows: int,
    status: str,
) -> Dict:
    return {
        "provider": provider,
        "scheme": scheme,
        "latest_db_date": latest_db_date.isoformat() if latest_db_date else None,
        "requested_start_date": start_date.isoformat(),
        "requested_end_date": end_date.isoformat(),
        "fetched_rows": fetched_rows,
        "status": status,
    }
