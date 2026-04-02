from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Dict, List

from kiwisaver_insight.config import settings
from kiwisaver_insight.crawlers.anz import ANZCrawler
from kiwisaver_insight.crawlers.westpac import WestpacCrawler
from kiwisaver_insight.scheme_catalog import list_tracked_schemes
from kiwisaver_insight.services.asb_service import current_price_changes
from kiwisaver_insight.utils.db import fetch_latest_price

SOURCE_PUBLIC_URLS = {
    "ASB": settings.asb_unit_price_url,
    "ANZ": "https://customer.anz.co.nz/ANZUnitPrices",
    "Westpac": settings.westpac_unit_price_pdf_url,
}


def verify_live_sources_against_db() -> Dict:
    checks: List[Dict] = []

    asb_live = current_price_changes(lookback_days=14, store=False)
    asb_funds = {fund["scheme"]: fund for fund in asb_live["funds"]}
    for scheme in list_tracked_schemes("ASB"):
        fund = asb_funds.get(scheme.scheme)
        if not fund:
            continue
        checks.append(
            _build_check(
                provider=scheme.provider,
                scheme=scheme.scheme,
                display_name=scheme.display_name,
                source_price_date=asb_live["latest_price_date"],
                source_unit_price=fund["current_unit_price"],
            )
        )

    anz_latest_rows = _latest_rows_by_scheme(ANZCrawler().fetch_prices())
    for scheme in list_tracked_schemes("ANZ"):
        latest = anz_latest_rows.get(scheme.scheme)
        if not latest:
            continue
        checks.append(
            _build_check(
                provider=scheme.provider,
                scheme=scheme.scheme,
                display_name=scheme.display_name,
                source_price_date=latest["date"].isoformat(),
                source_unit_price=float(latest["unit_price"]),
            )
        )

    westpac_latest_rows = _latest_rows_by_scheme(WestpacCrawler().fetch_prices())
    for scheme in list_tracked_schemes("Westpac"):
        latest = westpac_latest_rows.get(scheme.scheme)
        if not latest:
            continue
        checks.append(
            _build_check(
                provider=scheme.provider,
                scheme=scheme.scheme,
                display_name=scheme.display_name,
                source_price_date=latest["date"].isoformat(),
                source_unit_price=float(latest["unit_price"]),
            )
        )

    summary = {
        "total": len(checks),
        "match": sum(1 for item in checks if item["status"] == "MATCH"),
        "stale_db": sum(1 for item in checks if item["status"] == "STALE_DB"),
        "price_mismatch": sum(1 for item in checks if item["status"] == "PRICE_MISMATCH"),
        "missing_in_db": sum(1 for item in checks if item["status"] == "MISSING_IN_DB"),
        "future_db": sum(1 for item in checks if item["status"] == "FUTURE_DB"),
    }

    return {
        "verified_at_utc": datetime.now(timezone.utc).isoformat(),
        "sources": SOURCE_PUBLIC_URLS,
        "summary": summary,
        "checks": checks,
    }


def _latest_row(rows: List[Dict], scheme: str) -> Dict | None:
    filtered = [row for row in rows if row["scheme"] == scheme]
    if not filtered:
        return None
    return max(filtered, key=lambda row: _parse_date(row["date"]))


def _latest_rows_by_scheme(rows: List[Dict]) -> Dict[str, Dict]:
    latest: Dict[str, Dict] = {}
    for row in rows:
        scheme = row["scheme"]
        existing = latest.get(scheme)
        if existing is None or _parse_date(row["date"]) > _parse_date(existing["date"]):
            latest[scheme] = row
    return latest


def _parse_date(value: str | date) -> date:
    return value if isinstance(value, date) else date.fromisoformat(value)


def _build_check(
    provider: str,
    scheme: str,
    display_name: str,
    source_price_date: str,
    source_unit_price: float,
) -> Dict:
    db_row = fetch_latest_price(provider, scheme)
    db_price = db_row["unit_price"] if db_row else None
    db_price_date = db_row["date"].isoformat() if db_row else None

    if not db_row:
        status = "MISSING_IN_DB"
        note = "No stored row exists for this provider and scheme."
    elif db_price_date < source_price_date:
        status = "STALE_DB"
        note = "Stored data is older than the current live source snapshot."
    elif db_price_date > source_price_date:
        status = "FUTURE_DB"
        note = "Stored data is newer than the live source date being compared."
    elif abs(float(db_price) - float(source_unit_price)) > 1e-6:
        status = "PRICE_MISMATCH"
        note = "Stored price for the same date differs from the current live source."
    else:
        status = "MATCH"
        note = "Stored row matches the current live source snapshot."

    return {
        "provider": provider,
        "scheme": scheme,
        "display_name": display_name,
        "source_url": SOURCE_PUBLIC_URLS[provider],
        "source_price_date": source_price_date,
        "source_unit_price": source_unit_price,
        "db_price_date": db_price_date,
        "db_unit_price": db_price,
        "status": status,
        "note": note,
        "unit_price_delta": round(float(source_unit_price) - float(db_price), 6) if db_price is not None else None,
    }
